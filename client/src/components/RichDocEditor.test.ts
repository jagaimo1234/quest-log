import { describe, it, expect } from "vitest";
import { parseDocBlocks, serializeDocBlocks, extractPlainText } from "./RichDocEditor";

describe("RichDocEditor parsing & serialization", () => {
  it("parses empty string to single text block with stable id", () => {
    const blocks = parseDocBlocks("");
    expect(blocks).toEqual([{ id: "b-txt-0", type: "text", text: "" }]);
  });

  it("parses plain text without images into single stable block", () => {
    const text = "☑9/11-14 おかん東京\n☑・9/13-14 箱根宿泊\n\n・運動を継続して。";
    const blocks = parseDocBlocks(text);
    expect(blocks.length).toBe(1);
    expect(blocks[0].id).toBe("b-txt-0");
    expect(blocks[0].type).toBe("text");
    expect(blocks[0].text).toBe(text);
  });

  it("parses text with rich formatting tags intact", () => {
    const text = 'こんにちは、<mark class="marker-yellow">重要メモ</mark>と<span class="color-red">赤文字</span>です。';
    const blocks = parseDocBlocks(text);
    expect(blocks.length).toBe(1);
    expect(blocks[0].text).toBe(text);
  });

  it("serializes rich formatting tags correctly", () => {
    const text = 'テスト：<mark class="marker-pink">ハイライト</mark>';
    const blocks = parseDocBlocks(text);
    const serialized = serializeDocBlocks(blocks);
    expect(serialized).toBe(text);
  });

  it("correctly handles interleaved images and text blocks", () => {
    const raw = "前に文章\n![写真1](data:image/webp;base64,123)\n後ろの文章";
    const blocks = parseDocBlocks(raw);
    expect(blocks.length).toBe(3);
    expect(blocks[0].type).toBe("text");
    expect(blocks[0].text).toBe("前に文章");
    expect(blocks[1].type).toBe("image");
    expect(blocks[2].type).toBe("text");
    expect(blocks[2].text).toBe("後ろの文章");

    const serialized = serializeDocBlocks(blocks);
    expect(serialized).toBe(raw);
  });

  it("extractPlainText strips HTML tags and image markdown", () => {
    const text = '前の文章\n![写真](data:image/webp;base64,123)\n<mark class="marker-yellow">ハイライト</mark>&nbsp;文字<span class="color-blue">青</span>';
    const pure = extractPlainText(text);
    expect(pure).toBe("前の文章\n\nハイライト 文字青");
  });
});
