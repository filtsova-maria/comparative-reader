from collections.abc import Iterable, Mapping
from typing import Any

_JS_WHITESPACE = frozenset(
    "\u0009\u000a\u000b\u000c\u000d\u0020\u00a0\u1680"
    "\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a"
    "\u2028\u2029\u202f\u205f\u3000\ufeff"
)


def word_count(text: str) -> int:
    count = 0
    in_word = False
    for character in text:
        if character in _JS_WHITESPACE:
            in_word = False
        elif not in_word:
            count += 1
            in_word = True
    return count


def add_word_starts(
    sentences: Iterable[Mapping[str, Any]],
) -> list[dict[str, Any]]:
    normalized_sentences = []
    word_start = 0
    for sentence in sentences:
        current_word_start = sentence.get("word_start", word_start)
        normalized_sentences.append(
            {**sentence, "word_start": current_word_start}
        )
        word_start = current_word_start + word_count(sentence["text"])
    return normalized_sentences


def word_offset_at_utf16(text: str, offset: int) -> int:
    word_index = -1
    utf16_offset = 0
    in_word = False
    for character in text:
        code_units = 2 if ord(character) > 0xFFFF else 1
        if character in _JS_WHITESPACE:
            in_word = False
        else:
            if not in_word:
                word_index += 1
                in_word = True
            if utf16_offset <= offset < utf16_offset + code_units:
                return word_index
        utf16_offset += code_units
    return 0
