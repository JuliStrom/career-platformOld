import { Response } from "express";
import User from "../models/User";
import { initializeAccountFavorites } from "../services/accountFavorites";
import Job from "../models/Job";
import { AuthRequest } from "../types";
import { getErrorMessage } from "../utils/errorHandlers";

const changeFavorite =
  (adding: boolean) =>
  async (req: AuthRequest<{ id: string }>, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Пользователь не авторизован" });
        return;
      }

      const { id: jobId } = req.params;
      const userId = req.user.userId;

      if (adding) {
        // Проверяем, существует ли вакансия
        const job = await Job.findById(jobId);
        if (!job) {
          res.status(404).json({ error: "Вакансия не найдена" });
          return;
        }

        // Проверяем, активна ли вакансия
        if (!job.isActive) {
          res
            .status(400)
            .json({ error: "Нельзя добавить неактивную вакансию в избранное" });
          return;
        }
      }

      if (!(await initializeAccountFavorites(userId))) {
        res.status(401).json({ error: "account_not_found" });
        return;
      }
      const account = await User.findByIdAndUpdate(
        userId,
        adding
          ? { $addToSet: { favoriteJobs: jobId } }
          : { $pull: { favoriteJobs: jobId } },
        { new: true },
      ).select("favoriteJobs");

      res.status(200).json({
        message: adding
          ? "Вакансия добавлена в избранное"
          : "Вакансия удалена из избранного",
        favoriteJobsCount: account?.favoriteJobs?.length ?? 0,
      });
    } catch (error: unknown) {
      res.status(500).json({ error: getErrorMessage(error) });
    }
  };
export const addToFavorites = changeFavorite(true);
export const removeFromFavorites = changeFavorite(false);

// Получение списка избранных вакансий
export const getFavorites = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Пользователь не авторизован" });
      return;
    }

    const userId = req.user.userId;

    if (!(await initializeAccountFavorites(userId))) {
      res.status(401).json({ error: "account_not_found" });
      return;
    }
    const account = await User.findById(userId)
      .select("favoriteJobs")
      .populate({
        path: "favoriteJobs",
        match: { isActive: true },
        populate: { path: "createdBy", select: "email role" },
      });
    const favoriteJobs = (account?.favoriteJobs ?? []).filter(
      (job) => job != null,
    );

    res.status(200).json({
      total: favoriteJobs.length,
      favoriteJobs,
    });
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
};
