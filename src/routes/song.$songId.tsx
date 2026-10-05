import { createFileRoute } from "@tanstack/react-router";
import { SongDetail } from "../components/SongDetail";

export const Route = createFileRoute("/song/$songId")({
  component: SongPage,
});

function SongPage() {
  const { songId } = Route.useParams();
  return <SongDetail songId={songId} />;
}
