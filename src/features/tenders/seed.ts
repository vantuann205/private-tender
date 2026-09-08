import type { Tender } from "./domain";
export function seedTenders(now = Date.now()): Tender[] {
  const base = {
    organization: "Northstar Collective",
    createdAt: new Date(now).toISOString(),
    winnerRule: "Lowest eligible bid",
  };
  const deadline = (days: number) =>
    new Date(now + days * 86400000).toISOString();
  return [
    {
      ...base,
      id: "pt-2026-001",
      title: "Workspace equipment & installation",
      category: "Office & facilities",
      description:
        "Supply ergonomic workstations and meeting-room equipment for our new regional office. The scope includes delivery, installation, and a two-year service commitment.",
      requirements: [
        "Registered business with a valid trade license",
        "At least three years of relevant delivery experience",
        "Ability to provide a two-year equipment warranty",
      ],
      deadline: deadline(12),
      status: "Open",
    },
    {
      ...base,
      id: "pt-2026-002",
      title: "Annual infrastructure security review",
      category: "Technology",
      description:
        "An independent security assessment of our cloud infrastructure, with a prioritized remediation report and follow-up review.",
      requirements: [
        "Accredited information security practice",
        "Two comparable engagements completed",
      ],
      deadline: deadline(5),
      status: "Open",
    },
    {
      ...base,
      id: "pt-2026-003",
      title: "Low-impact regional logistics",
      category: "Operations",
      description:
        "A regional distribution partner for scheduled office deliveries with transparent environmental reporting.",
      requirements: [
        "Regional distribution coverage",
        "Documented emissions reporting process",
      ],
      deadline: deadline(21),
      status: "Draft",
    },
    {
      ...base,
      id: "pt-2026-004",
      title: "Community research partnership",
      category: "Professional services",
      description:
        "Qualitative research with community stakeholders to inform our next year of program delivery.",
      requirements: ["Demonstrated community research experience"],
      deadline: deadline(-3),
      status: "Closed",
    },
  ];
}
