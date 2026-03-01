import { CommandCenter } from "@/components/domain/command-center/CommandCenter";

export const metadata = {
  title: "Command Center — EcodiaOS",
  description: "Cybersecurity pipeline orchestration",
};

export default function CommandCenterPage() {
  return (
    <div style={{ height: "calc(100vh - 48px)" }}>
      <CommandCenter />
    </div>
  );
}
