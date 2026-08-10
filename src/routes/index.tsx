import { createFileRoute } from "@tanstack/react-router";

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
    <main className="h-screen w-screen bg-background">
      <h1 className="sr-only">Guitar Lab — gestion de mes fiches de formation à la guitare</h1>
      <iframe
        src="/guitar-lab.html"
        title="Guitar Lab"
        className="h-full w-full border-0"
      />
    </main>
  );
}
