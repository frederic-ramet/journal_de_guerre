#!/usr/bin/env python3
"""
Interactive interface for Journal de Guerre content.
This app allows users to chat with the extracted text and view related images.
"""

import os
import sys
import json
import numpy as np
import streamlit as st
from pathlib import Path
from typing import List, Dict, Tuple, Optional
import anthropic
from PIL import Image
import pickle
import base64
import tempfile
from gtts import gTTS
from sentence_transformers import SentenceTransformer

# Add embeddings functionality
class EmbeddingEngine:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        """Initialize the embedding engine with a sentence transformer model."""
        self.model = SentenceTransformer(model_name)
        
    def embed_text(self, text: str) -> np.ndarray:
        """Generate embeddings for a text string."""
        return self.model.encode(text)
    
    def calculate_similarity(self, embedding1: np.ndarray, embedding2: np.ndarray) -> float:
        """Calculate cosine similarity between two embeddings."""
        return np.dot(embedding1, embedding2) / (np.linalg.norm(embedding1) * np.linalg.norm(embedding2))

class JournalContentStore:
    def __init__(self, text_path: str, image_dir: str, embed_cache_path: str = None):
        """Initialize the content store with text and image paths."""
        self.text_path = text_path
        self.image_dir = Path(image_dir)
        self.embed_cache_path = embed_cache_path or "embeddings_cache.pkl"
        self.content_chunks = []
        self.image_paths = []
        self.embeddings = {}
        self.embedding_engine = EmbeddingEngine()
        
        self._load_content()
        self._load_images()
        self._load_or_create_embeddings()
    
    def _load_content(self):
        """Load and chunk the extracted text content."""
        if not os.path.exists(self.text_path):
            self.content_chunks = []
            return
            
        with open(self.text_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Split by the separator used in the extraction script
        self.content_chunks = [chunk.strip() for chunk in content.split("\n\n---\n\n") if chunk.strip()]
    
    def _load_images(self):
        """Load paths to all images in the image directory."""
        if not os.path.exists(self.image_dir):
            self.image_paths = []
            return
            
        image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff'}
        self.image_paths = [str(f) for f in self.image_dir.glob('**/*') 
                           if f.suffix.lower() in image_extensions]
    
    def _load_or_create_embeddings(self):
        """Load cached embeddings or create new ones."""
        try:
            if os.path.exists(self.embed_cache_path):
                with open(self.embed_cache_path, 'rb') as f:
                    cached_data = pickle.load(f)
                    self.embeddings = cached_data.get('embeddings', {})
        except Exception as e:
            st.warning(f"Could not load embeddings cache: {e}")
            self.embeddings = {}
        
        # Generate embeddings for any chunks that don't have them
        if len(self.content_chunks) > 0 and (
            len(self.embeddings.get('chunks', [])) != len(self.content_chunks)
        ):
            self._generate_embeddings()
    
    def _generate_embeddings(self):
        """Generate embeddings for content chunks and images."""
        with st.spinner("Generating embeddings for content..."):
            # Embed text chunks
            chunk_embeddings = []
            for chunk in self.content_chunks:
                chunk_embeddings.append(self.embedding_engine.embed_text(chunk))
            
            self.embeddings['chunks'] = chunk_embeddings
            
            # Save to cache
            with open(self.embed_cache_path, 'wb') as f:
                pickle.dump({'embeddings': self.embeddings}, f)
    
    def search_content(self, query: str, top_n: int = 3) -> List[Tuple[str, float, Optional[str]]]:
        """Search for content related to a query, returning text chunks and optional images."""
        if not self.content_chunks:
            return []
            
        # Embed the query
        query_embedding = self.embedding_engine.embed_text(query)
        
        # Calculate similarity with each chunk
        similarities = []
        for i, chunk_embedding in enumerate(self.embeddings.get('chunks', [])):
            similarity = self.embedding_engine.calculate_similarity(query_embedding, chunk_embedding)
            similarities.append((self.content_chunks[i], similarity, None))
        
        # Sort by similarity and return top_n
        similarities.sort(key=lambda x: x[1], reverse=True)
        return similarities[:top_n]
    
    def get_full_context(self) -> str:
        """Get the full content as a single string."""
        return "\n\n".join(self.content_chunks)
    
    def get_random_image(self) -> str:
        """Get a random image path from the collection."""
        if not self.image_paths:
            return None
        import random
        return random.choice(self.image_paths)

def text_to_speech(text: str, lang: str = 'fr') -> str:
    """Convert text to speech and return a base64 encoded audio string."""
    try:
        with tempfile.NamedTemporaryFile(delete=True, suffix='.mp3') as fp:
            # Create gTTS object and save to file
            tts = gTTS(text=text, lang=lang, slow=False)
            tts.save(fp.name)
            
            # Read the audio file and encode to base64
            with open(fp.name, "rb") as audio_file:
                audio_bytes = audio_file.read()
                b64 = base64.b64encode(audio_bytes).decode()
                return b64
    except Exception as e:
        st.error(f"Error in text-to-speech conversion: {str(e)}")
        return ""

class ChatInterface:
    def __init__(self, content_store: JournalContentStore):
        """Initialize the chat interface with a content store."""
        self.content_store = content_store
        self.claude_client = None
        
        # Try to initialize Claude client if API key is available
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if api_key:
            self.claude_client = anthropic.Anthropic(api_key=api_key)
    
    def query(self, user_input: str, system_prompt: str, use_rag: bool = True, 
              temperature: float = 0.7) -> str:
        """Query the LLM with user input and optional RAG content."""
        if not self.claude_client:
            return "Claude API key not configured. Please set the ANTHROPIC_API_KEY environment variable."
        
        # Get relevant content if RAG is enabled
        context = ""
        if use_rag:
            top_results = self.content_store.search_content(user_input, top_n=3)
            if top_results:
                context_chunks = [result[0] for result in top_results]
                context = "Here are some relevant excerpts from the journal:\n\n" + "\n\n---\n\n".join(context_chunks)
        
        # Build the full system prompt
        full_system_prompt = system_prompt
        if context:
            full_system_prompt += f"\n\nRelevant content from the journal:\n{context}"
        
        # Query Claude
        try:
            response = self.claude_client.messages.create(
                model="claude-3-sonnet-20240229",
                max_tokens=2000,
                temperature=temperature,
                system=full_system_prompt,
                messages=[
                    {"role": "user", "content": user_input}
                ]
            )
            return response.content[0].text
        except Exception as e:
            return f"Error querying Claude: {str(e)}"
    
    def text_to_speech_response(self, text: str, lang: str = 'fr') -> str:
        """Convert a response to speech using TTS."""
        return text_to_speech(text, lang)

def main():
    st.set_page_config(
        page_title="Journal de Guerre - Interactive Interface",
        page_icon="📔",
        layout="wide"
    )
    
    st.title("Journal de Guerre - Interactive Interface")
    
    # Sidebar for configuration
    with st.sidebar:
        st.header("Configuration")
        
        text_path = st.text_input(
            "Path to extracted text file", 
            value="extracted_journal.txt"
        )
        
        image_dir = st.text_input(
            "Path to image directory",
            value="jpg"
        )
        
        st.subheader("Claude API")
        api_key = st.text_input(
            "Anthropic API Key", 
            value=os.environ.get("ANTHROPIC_API_KEY", ""),
            type="password"
        )
        if api_key:
            os.environ["ANTHROPIC_API_KEY"] = api_key
        
        st.subheader("Chat Settings")
        use_rag = st.checkbox("Enable RAG (retrieve relevant context)", value=True)
        temperature = st.slider("Temperature", min_value=0.0, max_value=1.0, value=0.7, step=0.1)
        
        system_prompt = st.text_area(
            "System Prompt",
            value="You are an assistant helping with the content of a journal. "
                  "Answer questions based on the journal content when available. "
                  "Be honest when information is not in the journal.",
            height=150
        )
        
        st.markdown("---")
        st.markdown("### Image Preview")
        show_random_image = st.button("Show Random Image")
    
    # Initialize content store
    try:
        content_store = JournalContentStore(text_path, image_dir)
        chat_interface = ChatInterface(content_store)
    except Exception as e:
        st.error(f"Error initializing content store: {str(e)}")
        st.stop()
    
    # Main chat interface
    col1, col2 = st.columns([2, 1])
    
    with col1:
        # Initialize chat history
        if "messages" not in st.session_state:
            st.session_state.messages = []
        
        # Display chat history
        for message in st.session_state.messages:
            with st.chat_message(message["role"]):
                st.markdown(message["content"])
        
        # Chat input
        if prompt := st.chat_input("Ask about the journal content..."):
            # Add user message to history
            st.session_state.messages.append({"role": "user", "content": prompt})
            
            # Display user message
            with st.chat_message("user"):
                st.markdown(prompt)
            
            # Generate and display assistant response
            with st.chat_message("assistant"):
                response = chat_interface.query(
                    prompt, 
                    system_prompt, 
                    use_rag=use_rag,
                    temperature=temperature
                )
                st.markdown(response)
            
            # Add assistant response to history
            st.session_state.messages.append({"role": "assistant", "content": response})
    
    # Display images
    with col2:
        st.subheader("Journal Images")
        
        if show_random_image or "current_image" not in st.session_state:
            image_path = content_store.get_random_image()
            if image_path:
                st.session_state.current_image = image_path
        
        if "current_image" in st.session_state and os.path.exists(st.session_state.current_image):
            st.image(st.session_state.current_image, caption=Path(st.session_state.current_image).name)

if __name__ == "__main__":
    main()