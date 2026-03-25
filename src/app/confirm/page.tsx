import ConfirmClient from "./ConfirmClient";

type ConfirmPageProps = {
  searchParams: Promise<{
    name?: string;
    phone?: string;
    date?: string;
    time?: string;
    address?: string;
    payment?: string;
    notes?: string;
  }>;
};

export default async function ConfirmPage({ searchParams }: ConfirmPageProps) {
  const params = await searchParams;

  return (
    <ConfirmClient
      name={params.name}
      phone={params.phone}
      date={params.date}
      time={params.time}
      address={params.address}
      payment={params.payment}
      notes={params.notes}
    />
  );
}