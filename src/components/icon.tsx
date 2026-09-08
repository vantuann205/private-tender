export function Icon({
  name,
  size = 20,
}: {
  name:
    "grid" | "plus" | "shield" | "arrow" | "clock" | "file" | "lock" | "search";
  size?: number;
}) {
  const paths = {
    grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
    plus: "M12 5v14 M5 12h14",
    shield: "M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6z M8 12l3 3 5-6",
    arrow: "M5 12h14 M14 7l5 5-5 5",
    clock: "M12 8v5l3 2 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
    file: "M14 2H5v20h14V7z M14 2v6h5 M8 12h8 M8 16h5",
    lock: "M5 10h14v11H5z M8 10V6a4 4 0 0 1 8 0v4",
    search: "M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
