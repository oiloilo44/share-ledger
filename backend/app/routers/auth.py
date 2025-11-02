"""인증 관련 FastAPI 라우터."""

from fastapi import APIRouter, Depends, Header, HTTPException, status

from app.schemas.auth import (
    AuthSession,
    PasswordHelpResponse,
    SignInRequest,
    SignOutRequest,
    SignUpRequest,
)
from app.services.auth import (
    AuthService,
    AuthServiceError,
    extract_bearer_token,
    get_auth_service,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=AuthSession, status_code=status.HTTP_201_CREATED)
async def sign_up(
    payload: SignUpRequest,
    auth_service: AuthService = Depends(get_auth_service),
) -> AuthSession:
    """이메일/비밀번호 회원가입."""
    try:
        return await auth_service.sign_up(
            email=payload.email,
            password=payload.password.get_secret_value(),
            full_name=payload.full_name,
        )
    except AuthServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.post("/login", response_model=AuthSession)
async def sign_in(
    payload: SignInRequest,
    auth_service: AuthService = Depends(get_auth_service),
) -> AuthSession:
    """이메일/비밀번호 로그인."""
    try:
        return await auth_service.sign_in(
            email=payload.email,
            password=payload.password.get_secret_value(),
        )
    except AuthServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.post("/logout", status_code=status.HTTP_200_OK)
async def sign_out(
    payload: SignOutRequest,
    authorization: str = Header(..., alias="Authorization"),
    auth_service: AuthService = Depends(get_auth_service),
) -> dict[str, str]:
    """현재 세션을 로그아웃한다."""
    access_token = extract_bearer_token(authorization)
    try:
        await auth_service.sign_out(
            access_token=access_token,
            refresh_token=payload.refresh_token,
        )
    except AuthServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    return {"message": "로그아웃이 완료되었습니다."}


@router.get("/password-help", response_model=PasswordHelpResponse)
async def password_help() -> PasswordHelpResponse:
    """비밀번호 도움말 안내."""
    return PasswordHelpResponse(message="관리자에게 문의해주세요: support@shareledger.app")
