import CreateEventView from "@/views/events/create-event";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditEventPage({ params }: PageProps) {
  const { id } = await params;
  return <CreateEventView eventId={id} />;
}
