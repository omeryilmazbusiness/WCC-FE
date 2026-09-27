import { SecurityView } from "@/views/security-view";

type Props = { searchParams: Promise<{ enroll?: string }> };

export default async function SecurityPage({ searchParams }: Props) {
  const { enroll } = await searchParams;
  return <SecurityView enrollmentRequired={enroll === "required"} />;
}
