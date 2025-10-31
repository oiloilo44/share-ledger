from fastapi import FastAPI


def create_app() -> FastAPI:
    """Create and configure the FastAPI application instance."""
    app = FastAPI(title="ShareLedger API", version="0.1.0")

    return app


app = create_app()
