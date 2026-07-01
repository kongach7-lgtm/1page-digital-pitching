"use client";

type EntryWithVotes = {
  id: string;
  ideaName: string;
  name: string;
  studentId: string;
  imageUrl: string;
  problem: string;
  price: string;
  voteCount: number;
};

export default function EntryCard({
  entry,
  rank,
  disabled,
  onVote,
}: {
  entry: EntryWithVotes;
  rank: number;
  disabled: boolean;
  onVote: (entryId: string) => void;
}) {
  const isTop10 = rank <= 10;

  return (
    <div
      className={`relative rounded-xl overflow-hidden bg-white/5 border ${
        isTop10 ? "border-brand-badge shadow-[0_0_16px_rgba(255,217,61,0.3)]" : "border-white/10"
      } flex flex-col`}
    >
      {isTop10 && (
        <div className="absolute top-2 left-2 z-10 bg-brand-badge text-brand-bg text-xs font-bold px-2 py-1 rounded-full">
          🔥 #{rank}
        </div>
      )}
      <div className="aspect-[4/3] bg-black/30">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={entry.imageUrl} alt={entry.ideaName} className="w-full h-full object-cover" />
      </div>
      <div className="p-3 flex flex-col gap-1 flex-1">
        <h3 className="font-semibold text-white truncate">{entry.ideaName}</h3>
        <p className="text-white/50 text-sm truncate">โดย {entry.name}</p>
        {entry.problem && (
          <p className="text-white/60 text-xs mt-1 line-clamp-2">
            <span className="text-white/40">ปัญหาที่แก้:</span> {entry.problem}
          </p>
        )}
        {entry.price && (
          <p className="text-brand-badge text-xs font-medium">{entry.price}</p>
        )}
        <div className="mt-auto pt-2 flex items-center justify-between">
          <span className="text-white/70 text-sm">{entry.voteCount} โหวต</span>
          <button
            onClick={() => onVote(entry.id)}
            disabled={disabled}
            className="rounded-full bg-brand-accent disabled:bg-white/10 disabled:text-white/30 text-white w-10 h-10 flex items-center justify-center text-lg transition"
          >
            ❤️
          </button>
        </div>
      </div>
    </div>
  );
}
