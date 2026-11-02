from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from services.tts_service import TTSService
import json

router = APIRouter()
tts_service = TTSService()

@router.websocket("/stream")
async def websocket_tts_stream(websocket: WebSocket):
    """
    WebSocket endpoint for streaming TTS audio
    Client sends: { book_id, page_number, speed }
    Server streams back: binary audio chunks
    """
    await websocket.accept()
    
    try:
        while True:
            # Receive message from client
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
            except json.JSONDecodeError:
                await websocket.send_json({"error": "Invalid JSON format"})
                continue
            except Exception as e:
                print(f"Error receiving message: {e}")
                break
            
            action = message.get("action")
            
            if action == "start":
                try:
                    # Reset state for new streaming session
                    tts_service.reset()
                    
                    # Start narration
                    book_id = message.get("book_id")
                    page_number = message.get("page_number", 1)
                    speed = message.get("speed", 1.0)
                    text = message.get("text", "")
                    start_position = message.get("start_position", 0)  # Character position to start from
                    
                    # Validate inputs
                    if not text or not text.strip():
                        await websocket.send_json({"error": "No text provided"})
                        continue
                    
                    if not 0.5 <= speed <= 2.5:
                        await websocket.send_json({"error": "Speed must be between 0.5 and 2.5"})
                        continue
                    
                    # Stream audio chunks with word timing information
                    try:
                        async for chunk_data in tts_service.stream_audio(text, speed, start_position):
                            # Check if this page should be skipped (only one chunk)
                            if chunk_data.get('skip_page'):
                                print(f"⏭️  Skipping page {page_number}: {chunk_data.get('reason')}")
                                await websocket.send_json({
                                    "type": "single_chunk_page",
                                    "reason": chunk_data.get('reason'),
                                    "page_number": page_number,
                                })
                                break  # Don't send any audio for this page
                            
                            # Send word timing information first (as JSON)
                            await websocket.send_json({
                                "type": "timing",
                                "sentence": chunk_data['sentence'],
                                "sentence_index": chunk_data['sentence_index'],
                                "words": chunk_data['words'],
                                "word_timings": chunk_data['word_timings'],
                            })
                            # Then send the audio data (as binary)
                            await websocket.send_bytes(chunk_data['audio'])
                    except Exception as e:
                        print(f"Error during audio streaming: {e}")
                        await websocket.send_json({"error": f"Audio generation failed: {str(e)}"})
                        continue
                    
                    # Signal completion (only if page wasn't skipped)
                    await websocket.send_json({"status": "completed"})
                    
                except Exception as e:
                    print(f"Error in start action: {e}")
                    await websocket.send_json({"error": f"Failed to start narration: {str(e)}"})
                
            elif action == "pause":
                tts_service.pause()
                await websocket.send_json({"status": "paused"})
                
            elif action == "resume":
                tts_service.resume()
                await websocket.send_json({"status": "resumed"})
                
            elif action == "stop":
                tts_service.stop()
                await websocket.send_json({"status": "stopped"})
                break
            else:
                await websocket.send_json({"error": f"Unknown action: {action}"})
                
    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"WebSocket error: {str(e)}")
        try:
            await websocket.send_json({"error": "Internal server error"})
        except:
            pass
    finally:
        try:
            await websocket.close()
        except:
            pass
