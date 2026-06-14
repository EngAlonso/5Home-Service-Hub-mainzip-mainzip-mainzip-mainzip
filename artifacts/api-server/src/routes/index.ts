import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import servicesRouter from "./services";
import locationsRouter from "./locations";
import requestsRouter from "./requests";
import offersRouter from "./offers";
import messagesRouter from "./messages";
import ratingsRouter from "./ratings";
import pointsRouter from "./points";
import commissionRangesRouter from "./commission-ranges";
import supportRouter from "./support";
import notificationsRouter from "./notifications";
import cmsRouter from "./cms";
import analyticsRouter from "./analytics";
import bannersRouter from "./banners";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(servicesRouter);
router.use(locationsRouter);
router.use(requestsRouter);
router.use(offersRouter);
router.use(messagesRouter);
router.use(ratingsRouter);
router.use(pointsRouter);
router.use(commissionRangesRouter);
router.use(supportRouter);
router.use(notificationsRouter);
router.use(cmsRouter);
router.use(analyticsRouter);
router.use(bannersRouter);

export default router;
