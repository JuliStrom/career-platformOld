import Job from "../models/Job";
import type { AnalysisGoal, ExtractedResume } from "../schemas/resumeAnalysis";

const normalize = (s: string) =>
  s.normalize("NFKC").toLocaleLowerCase().replace(/\s+/g, " ").trim();
const countryGroups = [
  ["belarus", "беларусь", "белоруссия"],
  ["kazakhstan", "казахстан", "kz"],
  ["russia", "россия", "рф"],
  ["uzbekistan", "узбекистан"],
  ["germany", "германия"],
  ["poland", "польша"],
  ["usa", "united states", "сша"],
  ["uk", "united kingdom", "великобритания"],
];

export function rankJobs(
  jobs: any[],
  profile: ExtractedResume["profile"],
  goal: AnalysisGoal,
) {
  const country = normalize(goal.targetCountry);
  const aliases = countryGroups.find((group) => group.includes(country)) || [
    country,
  ];
  const anyCountry = ["any", "любая", "anywhere", "везде"].includes(country);
  return jobs
    .flatMap((job) => {
      const location = normalize(job.location || "");
      const locationMatch =
        anyCountry ||
        aliases.some((a) =>
          new RegExp(
            `(^|[^\\p{L}])${a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\p{L}]|$)`,
            "u",
          ).test(location),
        );
      const remote = job.workFormat === "Remote";
      // An unspecified remote location is not a promise of worldwide eligibility.
      if (!locationMatch && !remote) return [];
      const haystack = normalize(
        [
          job.title,
          job.description,
          ...(job.requirements || []),
          ...(job.responsibilities || []),
        ].join(" "),
      );
      const skills = profile.skills.filter((skill) => {
        const value = normalize(skill);
        return (
          value.length > 1 &&
          new RegExp(
            `(^|[^\\p{L}\\p{N}])${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\p{L}\\p{N}]|$)`,
            "u",
          ).test(haystack)
        );
      });
      const direction = Boolean(
        profile.direction && profile.direction === job.direction,
      );
      const role = normalize(goal.desiredRole || profile.role || "");
      const roleMatch = role.length > 2 && haystack.includes(role);
      if (!direction && !skills.length && !roleMatch) return [];
      const score = Math.round(
        (40 * skills.length) / Math.max(1, profile.skills.length) +
          (direction ? 30 : 0) +
          (profile.level === job.level ? 20 : 0) +
          (locationMatch ? 10 : 0),
      );
      return [
        {
          id: String(job._id),
          title: job.title,
          company: job.company,
          description: job.description,
          direction: job.direction,
          level: job.level,
          workFormat: job.workFormat,
          location: job.location,
          salary: job.salary,
          requirements: job.requirements,
          responsibilities: job.responsibilities,
          matchScore: score,
          matchedSkills: skills,
          locationNeedsConfirmation: remote && !locationMatch,
        },
      ];
    })
    .sort((a, b) => b.matchScore - a.matchScore || a.id.localeCompare(b.id));
}

export async function matchResumeJobs(
  profile: ExtractedResume["profile"],
  goal: AnalysisGoal,
) {
  const jobs = await Job.find({ isActive: true }).lean();
  return rankJobs(jobs, profile, goal);
}
