export default function StudentBackground({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-orange-50 via-amber-50 to-sky-50">
      <div className="pointer-events-none absolute -top-20 -left-20 h-72 w-72 rounded-full bg-pink-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-sky-200/40 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 right-1/4 h-56 w-56 rounded-full bg-violet-200/30 blur-3xl" />
      <div className="relative">{children}</div>
    </div>
  );
}
