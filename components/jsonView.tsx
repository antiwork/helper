interface JsonViewProps {
  data: any;
  level?: number;
}

export const JsonView = ({ data, level = 0 }: JsonViewProps) => {
  const indent = level * 2;

  if (Array.isArray(data)) {
    if (data.length === 0) return <span>(empty)</span>;

    return (
      <div>
        <div style={{ marginLeft: `${indent}ch` }}>
          {data.map((item, index) => (
            <div key={index}>
              <JsonView data={item} level={level + 1} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data && typeof data === "object") {
    const entries = Object.entries(data);

    if (entries.length === 0) return <span>(empty)</span>;

    return (
      <div>
        <div style={{ marginLeft: `${indent}ch` }}>
          {entries.map(([key, value]) => (
            <div key={key}>
              <span>{key}: </span>
              <JsonView data={value} level={level + 1} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return <span className="text-foreground">{String(data)}</span>;
};
