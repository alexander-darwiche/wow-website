from fastapi import FastAPI, HTTPException, Depends
from typing import Annotated, List
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import SessionLocal, engine
import models
from fastapi.middleware.cors import CORSMiddleware
import data_models
from app.utils.send_email import send_email
from random import randint
from cryptography.fernet import Fernet

app = FastAPI()

origins = [
    "http://localhost:3000"
]


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials= True,
    allow_methods = ['*'],
    allow_headers = ['*']
)

# Post Movies (create new)
@app.post("/movies/")
async def add_movie():
    test = {'hi':'hi'}
    return test


# Get All Movies (select)
@app.get("/movies/")
async def get_movies():
    test = {'hi':'hi'}
    return test


from authlib.integrations.starlette_client import OAuth
from starlette.config import Config

config = Config('.env')  # read config from .env file
oauth = OAuth(config)
oauth.register(
    name='warcraftlogs',
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={
        'scope': 'openid email profile'
    }
)