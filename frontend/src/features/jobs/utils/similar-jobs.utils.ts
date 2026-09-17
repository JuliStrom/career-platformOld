import * as jobsApi from '@/features/jobs/api';
import type { Job } from '@/features/jobs/model';

export const SIMILAR_JOBS_COUNT = 3;

function takeUniqueJobs(
  source: Job[],
  excludeIds: Set<string>,
  limit: number
): Job[] {
  const picked: Job[] = [];
  for (const item of source) {
    if (excludeIds.has(item._id)) continue;
    picked.push(item);
    excludeIds.add(item._id);
    if (picked.length >= limit) break;
  }
  return picked;
}

/** Похожие вакансии: сначала direction + level, затем добор по direction. */
export async function fetchSimilarJobs(job: Job): Promise<Job[]> {
  const excludeIds = new Set([job._id]);

  const { jobs: exactMatches } = await jobsApi.getJobs({
    direction: job.direction,
    level: job.level,
    limit: 20,
  });
  const picked = takeUniqueJobs(
    exactMatches,
    excludeIds,
    SIMILAR_JOBS_COUNT
  );

  if (picked.length >= SIMILAR_JOBS_COUNT) {
    return picked;
  }

  try {
    const { jobs: directionMatches } = await jobsApi.getJobs({
      direction: job.direction,
      limit: 20,
    });
    picked.push(
      ...takeUniqueJobs(
        directionMatches,
        excludeIds,
        SIMILAR_JOBS_COUNT - picked.length
      )
    );
  } catch {
    // оставляем точные совпадения, если добор не удался
  }

  return picked;
}
