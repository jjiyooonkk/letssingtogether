import { getSongs } from "@/lib/songs";
import HomeClient from "./HomeClient";

export const dynamic = "force-dynamic";

export default function Home() {
  const songs = getSongs();
  return <HomeClient songs={songs} />;
}
