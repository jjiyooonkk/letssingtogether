import { getSongs } from "@/lib/songs";
import HomeClient from "./HomeClient";

export const dynamic = "force-dynamic";

export default async function Home() {
  const songs = await getSongs();
  return <HomeClient songs={songs} />;
}
