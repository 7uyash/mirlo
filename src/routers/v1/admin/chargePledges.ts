import { NextFunction, Request, Response } from "express";
import { userAuthenticated, userHasPermission } from "../../../auth/passport";
import { getSiteSettings } from "../../../utils/settings";
import prisma from "@mirlo/prisma";
import { chargePledgePayments } from "../../../utils/stripe";

export default function () {
  const operations = {
    POST: [userAuthenticated, userHasPermission("admin"), POST],
  };

  async function POST(req: Request, res: Response, next: NextFunction) {
    const { trackGroupId } = req.body;
    try {
      const pledgesForTrackGroups = await prisma.trackGroupPledge.findMany({
        where: {
          trackGroupId: trackGroupId ? Number(trackGroupId) : undefined,
          paidAt: null,
          cancelledAt: null,
        },
        include: {
          user: true,
          trackGroup: true,
        },
      });

      for (const pledge of pledgesForTrackGroups) {
        await chargePledgePayments(pledge);
      }

      return res.status(200).json({ success: true });
    } catch (e) {
      next(e);
    }
  }

  return operations;
}
