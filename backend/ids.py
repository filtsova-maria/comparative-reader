def normalize_id(value: str | int) -> str:
    raw = str(value)
    if not raw or not raw.isascii() or not raw.isdigit():
        raise ValueError("Testimony ID must contain only ASCII digits")
    return raw.zfill(5)
