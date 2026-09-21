// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { parseDocBlocks, serializeDocBlocks, extractPlainText, findRuleForElement, cleanEmptyFormattingHtml } from "./RichDocEditor";

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

import { applyFormatToRange, cleanupEmptyFormatting } from "../lib/richTextFormatting";

describe("richTextFormatting applyFormatToRange", () => {
  it("completely clears formatting on fully selected text", () => {
    const div = document.createElement("div");
    div.innerHTML = '<mark class="marker-yellow">Hello World</mark>';
    const textNode = div.firstChild!.firstChild as Text;
    const range = document.createRange();
    range.setStart(textNode, 0);
    range.setEnd(textNode, 11);

    applyFormatToRange(range, div, "clear");
    expect(div.innerHTML).toBe("Hello World");
  });

  it("completely clears formatting on partially selected text inside a mark", () => {
    const div = document.createElement("div");
    div.innerHTML = '<mark class="marker-yellow">Hello World !</mark>';
    const textNode = div.firstChild!.firstChild as Text;
    const range = document.createRange();
    range.setStart(textNode, 6); // "W"
    range.setEnd(textNode, 11); // "d"

    applyFormatToRange(range, div, "clear");
    expect(div.innerHTML).toBe('<mark class="marker-yellow">Hello </mark>World<mark class="marker-yellow"> !</mark>');
  });

  it("completely clears nested marker and text color formatting", () => {
    const div = document.createElement("div");
    div.innerHTML = '<mark class="marker-yellow"><span class="color-red">大事なテスト</span></mark>';
    const textNode = div.querySelector("span")!.firstChild as Text;
    const range = document.createRange();
    range.setStart(textNode, 0);
    range.setEnd(textNode, textNode.length);

    applyFormatToRange(range, div, "clear");
    expect(div.innerHTML).toBe("大事なテスト");
  });

  it("changes marker color cleanly without nesting duplicate mark tags", () => {
    const div = document.createElement("div");
    div.innerHTML = '<mark class="marker-yellow">Hello</mark>';
    const textNode = div.firstChild!.firstChild as Text;
    const range = document.createRange();
    range.setStart(textNode, 0);
    range.setEnd(textNode, 5);

    applyFormatToRange(range, div, "marker", "green");
    expect(div.innerHTML).toBe('<mark class="marker-green">Hello</mark>');
  });

  it("changes text color cleanly without nesting duplicate color spans", () => {
    const div = document.createElement("div");
    div.innerHTML = '<span class="color-red">Hello</span>';
    const textNode = div.firstChild!.firstChild as Text;
    const range = document.createRange();
    range.setStart(textNode, 0);
    range.setEnd(textNode, 5);

    applyFormatToRange(range, div, "color", "blue");
    expect(div.innerHTML).toBe('<span class="color-blue">Hello</span>');
  });

  it("clears formatting when caret is collapsed inside a styled element", () => {
    const div = document.createElement("div");
    div.innerHTML = '<mark class="marker-yellow">Hello</mark>';
    const textNode = div.firstChild!.firstChild as Text;
    const range = document.createRange();
    range.setStart(textNode, 2);
    range.setEnd(textNode, 2);
    applyFormatToRange(range, div, "clear");
    expect(div.innerHTML).toBe("Hello");
  });

  it("clears formatting across multiple styled elements and plain text", () => {
    const div = document.createElement("div");
    div.innerHTML = '<mark class="marker-yellow">First </mark>middle <span class="color-blue">Second</span>';
    const firstText = div.querySelector("mark")!.firstChild as Text;
    const secondText = div.querySelector("span")!.firstChild as Text;
    const range = document.createRange();
    range.setStart(firstText, 2); // "rst "
    range.setEnd(secondText, 3); // "Sec"

    applyFormatToRange(range, div, "clear");
    expect(div.innerHTML).toBe('<mark class="marker-yellow">Fi</mark>rst middle Sec<span class="color-blue">ond</span>');
  });

  it("clears formatting when startContainer and endContainer are Element nodes", () => {
    const div = document.createElement("div");
    div.innerHTML = '<mark class="marker-orange"><span class="color-green">・目的がブレないよう意識すること</span></mark><br><mark class="marker-orange"><span class="color-green">・次のアクション、判断を明確にしておく。</span></mark>';
    
    // User selected by dragging across lines, so range starts at div child 0 and ends at div child 3
    const range = document.createRange();
    range.setStart(div, 0);
    range.setEnd(div, div.childNodes.length);

    const res = applyFormatToRange(range, div, "clear");
    expect(res).not.toBeNull();
    expect(div.innerHTML).toBe("・目的がブレないよう意識すること<br>・次のアクション、判断を明確にしておく。");
  });
});

describe("Color Rules overlay resolution", () => {
  it("resolves marker rule for marker element", () => {
    const div = document.createElement("div");
    div.innerHTML = '<mark class="marker-yellow">重要メモ</mark>';
    const mark = div.querySelector("mark") as HTMLElement;
    const res = findRuleForElement(mark);
    expect(res).not.toBeNull();
    expect(res?.markerRule?.id).toBe("yellow");
    expect(res?.markerRule?.ruleTitle).toBe("重要・キーポイント");
  });

  it("resolves text color rule for color span element", () => {
    const div = document.createElement("div");
    div.innerHTML = '<span class="color-red">緊急アラート</span>';
    const span = div.querySelector("span") as HTMLElement;
    const res = findRuleForElement(span);
    expect(res).not.toBeNull();
    expect(res?.colorRule?.id).toBe("red");
    expect(res?.colorRule?.ruleTitle).toBe("警告・最重要");
  });

  it("resolves both rules when marker and color span are nested", () => {
    const div = document.createElement("div");
    div.innerHTML = '<mark class="marker-pink"><span class="color-purple">ボス討伐目標</span></mark>';
    const innerSpan = div.querySelector("span") as HTMLElement;
    const res = findRuleForElement(innerSpan);
    expect(res).not.toBeNull();
    expect(res?.markerRule?.id).toBe("pink");
    expect(res?.markerRule?.ruleTitle).toBe("注意・要警戒");
    expect(res?.colorRule?.id).toBe("purple");
    expect(res?.colorRule?.ruleTitle).toBe("大目標・指針");
  });

  it("returns null for unstyled element", () => {
    const div = document.createElement("div");
    div.innerHTML = '<p>プレーンテキスト</p>';
    const p = div.querySelector("p") as HTMLElement;
    const res = findRuleForElement(p);
    expect(res).toBeNull();
  });
});

describe("cleanEmptyFormattingHtml and residual pill prevention", () => {
  it("unwraps <mark><br></mark> to clean <br>", () => {
    const raw = '<mark class="marker-orange"><br></mark>';
    expect(cleanEmptyFormattingHtml(raw)).toBe("<br>");
  });

  it("removes empty <mark></mark> tags completely", () => {
    const raw = '<mark class="marker-yellow"></mark>';
    expect(cleanEmptyFormattingHtml(raw)).toBe("");
  });

  it("unwraps <mark>&nbsp;</mark> preserving space without color pill", () => {
    const raw = '<mark class="marker-orange">&nbsp;</mark>';
    expect(cleanEmptyFormattingHtml(raw)).toBe("&nbsp;");
  });

  it("unwraps nested empty formatting tags cleanly", () => {
    const raw = '<mark class="marker-orange"><span class="color-red"><br></span></mark>';
    expect(cleanEmptyFormattingHtml(raw)).toBe("<br>");
  });

  it("cleans empty formatting in multi-line diary text while preserving text highlights", () => {
    const diaryWithPillArtifacts = 
      '・目的がブレないよう意識すること\n' +
      '・次のアクション、判断を明確にしておく。\n' +
      '・やらないことも意識する\n' +
      '<mark class="marker-orange"><br></mark>\n' +
      '<mark class="marker-orange"><br></mark>\n' +
      '<mark class="marker-yellow"><br></mark>';

    const cleaned = cleanEmptyFormattingHtml(diaryWithPillArtifacts);
    expect(cleaned).toBe(
      '・目的がブレないよう意識すること\n' +
      '・次のアクション、判断を明確にしておく。\n' +
      '・やらないことも意識する\n' +
      '<br>\n' +
      '<br>\n' +
      '<br>'
    );
  });

  it("preserves actual highlighted text without stripping", () => {
    const validRich = '<mark class="marker-yellow">重要メモ</mark>と<span class="color-red">赤文字</span>';
    expect(cleanEmptyFormattingHtml(validRich)).toBe(validRich);
  });
});

describe("cleanupEmptyFormatting DOM cleanup", () => {
  it("cleans empty marks wrapping <br> from root element", () => {
    const div = document.createElement("div");
    div.innerHTML = '<p><mark class="marker-orange"><br></mark></p>';
    cleanupEmptyFormatting(div);
    expect(div.innerHTML).toBe("<p><br></p>");
  });

  it("removes whitespace-only marks from root element", () => {
    const div = document.createElement("div");
    div.innerHTML = '<p>前 <mark class="marker-yellow">   </mark> 後</p>';
    cleanupEmptyFormatting(div);
    expect(div.innerHTML).toBe("<p>前     後</p>");
  });

  it("cleans empty formatting during applyFormatToRange clear", () => {
    const div = document.createElement("div");
    div.innerHTML = 
      '・目的がブレないよう意識すること<br>' +
      '<mark class="marker-orange"><br></mark>';
    
    // Select the first line and clear
    const firstText = div.firstChild as Text;
    const range = document.createRange();
    range.setStart(firstText, 0);
    range.setEnd(firstText, 5);

    applyFormatToRange(range, div, "clear");
    // Residual empty mark on the second line should also be cleaned up automatically
    expect(div.innerHTML).toBe('・目的がブレないよう意識すること<br><br>');
  });
});

