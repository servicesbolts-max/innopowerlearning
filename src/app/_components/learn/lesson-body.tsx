import type { BlockNode, InlineNode } from "@/modules/courses";

/**
 * Renders parsed lesson text (typed nodes, never HTML). Links open in a new tab without the
 * opener or referrer.
 */
function Inline({ nodes }: { nodes: InlineNode[] }) {
  return nodes.map((n, i) => {
    switch (n.type) {
      case "text":
        return <span key={i}>{n.value}</span>;
      case "strong":
        return (
          <strong key={i} className="font-semibold">
            <Inline nodes={n.children} />
          </strong>
        );
      case "em":
        return (
          <em key={i}>
            <Inline nodes={n.children} />
          </em>
        );
      case "link":
        return (
          <a
            key={i}
            href={n.href}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="rounded-sm text-accent-text underline underline-offset-2 focus-ring"
          >
            {n.text}
          </a>
        );
    }
  });
}

export function LessonBody({ blocks }: { blocks: BlockNode[] }) {
  return (
    <div className="flex flex-col gap-4 text-body">
      {blocks.map((b, i) => {
        switch (b.type) {
          case "heading":
            return b.level === 2 ? (
              <h2 key={i} className="text-title2">
                <Inline nodes={b.children} />
              </h2>
            ) : (
              <h3 key={i} className="text-title3">
                <Inline nodes={b.children} />
              </h3>
            );
          case "paragraph":
            return (
              <p key={i}>
                <Inline nodes={b.children} />
              </p>
            );
          case "list": {
            const List = b.ordered ? "ol" : "ul";
            return (
              <List key={i} className={b.ordered ? "list-decimal ps-6" : "list-disc ps-6"}>
                {b.items.map((item, j) => (
                  <li key={j} className="py-0.5">
                    <Inline nodes={item} />
                  </li>
                ))}
              </List>
            );
          }
        }
      })}
    </div>
  );
}
