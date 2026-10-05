import { createFileRoute } from "@tanstack/react-router";
import { SongList } from "../components/SongList";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Guitar Lab — Mes fiches de formation guitare" },
      {
        name: "description",
        content:
          "Bibliothèque de morceaux et fiches de travail guitare : structure, rythmiques, accords, notes et sauvegarde par fichier iCloud.",
      },
      { property: "og:title", content: "Guitar Lab — Mes fiches de formation guitare" },
      {
        property: "og:description",
        content:
          "Gère ta bibliothèque de morceaux et travaille morceau par morceau : versions, structure, rythmiques, accords et notes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="min-h-screen w-screen bg-slate-950 text-slate-50">
      <header className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Guitar Lab</h1>
          <p className="text-sm text-slate-400">Mon atelier de formation guitare</p>
        </div>
        <div className="flex gap-2">
          {/* Future action buttons like "Add Song" or "Sync" */}
        </div>
      </header>

      <SongList />
    </main>
  );
}
