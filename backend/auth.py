"""JWT admin authentication (single seeded admin, Argon2 hashes)."""
import os
from datetime import datetime, timedelta, timezone
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import InvalidTokenError
from pwdlib import PasswordHash
from pydantic import BaseModel

JWT_ALGORITHM = "HS256"
password_hash = PasswordHash.recommended()
DUMMY_HASH = password_hash.hash("dummy-password-never-used")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/admin/login")


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class PublicAdmin(BaseModel):
    username: str
    role: str


def _secret() -> str:
    return os.environ.get("JWT_SECRET", "37656e46edb00671989c3e5ac238ab6be1ec9bb6d07cb1848e40441c5e97f0cc")


def create_access_token(username: str) -> str:
    now = datetime.now(timezone.utc)
    minutes = int(os.getenv("JWT_EXPIRE_MINUTES", "720"))
    claims = {"sub": username, "role": "admin", "iat": now, "exp": now + timedelta(minutes=minutes)}
    return jwt.encode(claims, _secret(), algorithm=JWT_ALGORITHM)


async def seed_admin(db):
    await db.admins.create_index("username", unique=True)
    username = os.environ.get("ADMIN_USERNAME", "admin")
    password = os.environ.get("ADMIN_PASSWORD", "RoutYAdmin2026Secure")
    await db.admins.update_one(
        {"username": username},
        {"$setOnInsert": {"username": username, "role": "admin", "password_hash": password_hash.hash(password)}},
        upsert=True,
    )


async def authenticate(db, username: str, password: str):
    user = await db.admins.find_one({"username": username})
    if not user:
        password_hash.verify(password, DUMMY_HASH)
        return None
    if not password_hash.verify(password, user["password_hash"]):
        return None
    return user


async def current_admin(request: Request, token: Annotated[str, Depends(oauth2_scheme)]) -> PublicAdmin:
    err = HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token", headers={"WWW-Authenticate": "Bearer"})
    try:
        payload = jwt.decode(token, _secret(), algorithms=[JWT_ALGORITHM])
        username, role = payload.get("sub"), payload.get("role")
        if not username or role != "admin":
            raise err
    except (InvalidTokenError, TypeError):
        raise err
    user = await request.app.state.db.admins.find_one({"username": username, "role": "admin"}, {"_id": 0, "username": 1, "role": 1})
    if not user:
        raise err
    return PublicAdmin(**user)
