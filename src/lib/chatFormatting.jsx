import React from "react";

const ORDERED_LIST_REGEX = /^(\s*)(\d+)([.)])(\s+)(.*)$/;
const BULLET_LIST_REGEX = /^(\s*)[-*+]\s+/;
const HEADING_REGEX = /^(#{1,6})\s+(.*)$/;
const CODE_FENCE_REGEX = /^```/;
const HORIZONTAL_RULE_REGEX = /^([-*_]\s*){3,}$/;
const BLOCKQUOTE_REGEX = /^>\s?/;

const getIndentWidth = (value) => value.replace(/\t/g, "    ").length;

export const normalizeOrderedListNumbering = (text) => {
  if (typeof text !== "string" || text.length === 0) {
    return text || "";
  }

  const lines = text.split("\n");
  const counters = [];
  let inCodeFence = false;

  return lines
    .map((line) => {
      const trimmed = line.trim();

      if (CODE_FENCE_REGEX.test(line)) {
        counters.length = 0;
        inCodeFence = !inCodeFence;
        return line;
      }

      if (inCodeFence || !trimmed) {
        return line;
      }

      if (
        HEADING_REGEX.test(trimmed) ||
        HORIZONTAL_RULE_REGEX.test(trimmed) ||
        BLOCKQUOTE_REGEX.test(trimmed)
      ) {
        counters.length = 0;
        return line;
      }

      const orderedMatch = line.match(ORDERED_LIST_REGEX);
      if (orderedMatch) {
        const indent = getIndentWidth(orderedMatch[1]);

        while (counters.length && counters[counters.length - 1].indent > indent) {
          counters.pop();
        }

        let counter = counters.find((item) => item.indent === indent);
        if (!counter) {
          counter = {
            indent,
            value: Number(orderedMatch[2]) || 1,
          };
          counters.push(counter);
        } else {
          counter.value += 1;
        }

        return `${orderedMatch[1]}${counter.value}${orderedMatch[3]}${orderedMatch[4]}${orderedMatch[5]}`;
      }

      if (BULLET_LIST_REGEX.test(line)) {
        return line;
      }

      const leadingWhitespace = line.match(/^\s*/)?.[0] || "";
      const lineIndent = getIndentWidth(leadingWhitespace);
      if (counters.length && lineIndent > counters[counters.length - 1].indent) {
        return line;
      }

      counters.length = 0;
      return line;
    })
    .join("\n");
};

const renderInline = (text) => {
  const parts = [];
  let lastIndex = 0;
  const regex = /\*\*(.+?)\*\*/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(<strong key={`${match.index}-${match[1]}`}>{match[1]}</strong>);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
};

const normalizeLine = (value) => {
  const cleaned = value.replace(/\s+/g, " ").trim();
  const labelMatch = cleaned.match(
    /^(Guiding Question|Explanation|Summary|Key Point|Conclusion):\s*/i
  );

  if (!labelMatch) {
    return cleaned;
  }

  const label = labelMatch[1];
  return `**${label}:** ${cleaned.slice(labelMatch[0].length)}`;
};

export const renderMessageContent = (text) => {
  const normalizedText = normalizeOrderedListNumbering(text || "");
  const lines = normalizedText.split("\n");
  const blocks = [];
  let paragraph = [];
  let listBuffer = [];
  let listType = null;
  let orderedListStart = 1;

  const flushParagraph = () => {
    if (!paragraph.length) {
      return;
    }

    blocks.push({ type: "p", lines: [...paragraph] });
    paragraph = [];
  };

  const flushList = () => {
    if (!listBuffer.length) {
      return;
    }

    if (listType === "ol") {
      blocks.push({ type: "ol", items: [...listBuffer], start: orderedListStart });
    } else {
      blocks.push({ type: listType, items: [...listBuffer] });
    }

    listBuffer = [];
    listType = null;
    orderedListStart = 1;
  };

  lines.forEach((raw, index) => {
    const line = raw.trim();

    if (!line) {
      if (listType) {
        const nextLine = lines.slice(index + 1).find((entry) => entry.trim());
        if (nextLine) {
          const trimmedNext = nextLine.trim();
          if (
            ORDERED_LIST_REGEX.test(nextLine) ||
            BULLET_LIST_REGEX.test(nextLine) ||
            (listType === "ul" && !HEADING_REGEX.test(trimmedNext))
          ) {
            return;
          }
        }
      }

      flushParagraph();
      flushList();
      return;
    }

    if (line.length <= 3 && !/[a-z0-9]/i.test(line)) {
      flushParagraph();
      flushList();
      return;
    }

    const headingMatch = line.match(HEADING_REGEX);
    if (headingMatch) {
      flushParagraph();
      flushList();
      blocks.push({
        type: "h",
        level: headingMatch[1].length,
        text: normalizeLine(headingMatch[2]),
      });
      return;
    }

    const orderedMatch = raw.match(ORDERED_LIST_REGEX);
    const bulletMatch = raw.match(BULLET_LIST_REGEX);

    if (orderedMatch) {
      flushParagraph();

      if (listType !== "ol") {
        flushList();
        listType = "ol";
        orderedListStart = Number(orderedMatch[2]) || 1;
      }

      listBuffer.push(normalizeLine(orderedMatch[5]));
      return;
    }

    if (bulletMatch) {
      flushParagraph();

      if (listType !== "ul") {
        flushList();
        listType = "ul";
      }

      listBuffer.push(normalizeLine(raw.replace(BULLET_LIST_REGEX, "")));
      return;
    }

    flushList();
    paragraph.push(normalizeLine(line));
  });

  flushParagraph();
  flushList();

  return (
    <div className="chat-format">
      {blocks.map((block, idx) => {
        if (block.type === "h") {
          const Tag = `h${Math.min(Math.max(block.level, 2), 4)}`;
          return <Tag key={`h-${idx}`}>{renderInline(block.text)}</Tag>;
        }

        if (block.type === "p") {
          return <p key={`p-${idx}`}>{renderInline(block.lines.join(" "))}</p>;
        }

        if (block.type === "ol") {
          return (
            <ol key={`ol-${idx}`} start={block.start}>
              {block.items.map((item, itemIndex) => (
                <li key={`oli-${itemIndex}`}>{renderInline(item)}</li>
              ))}
            </ol>
          );
        }

        return (
          <ul key={`ul-${idx}`}>
            {block.items.map((item, itemIndex) => (
              <li key={`uli-${itemIndex}`}>{renderInline(item)}</li>
            ))}
          </ul>
        );
      })}
    </div>
  );
};
