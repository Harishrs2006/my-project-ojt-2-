import { Router } from "express";
import { usersRouter } from "./users";
import { itemsRouter } from "./items";
import { interactionsRouter } from "./interactions";
import { recommendationsRouter } from "./recommendations";

export const router = Router();

router.use("/users", usersRouter);
router.use("/items", itemsRouter);
router.use("/interactions", interactionsRouter);
router.use("/recommendations", recommendationsRouter);
