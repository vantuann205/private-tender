import { ParticipationScreen } from "@/features/vendors/participation-screen";
export default async function ParticipatePage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <ParticipationScreen key={id} id={id} />; }
