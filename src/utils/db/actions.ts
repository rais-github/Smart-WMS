import { db } from "./dbConfig";
import {
  Users,
  Notifications,
  Transactions,
  Rewards,
  Reports,
  CollectedWastes,
  Coupons,
} from "./schema";
import { eq, sql, and, desc } from "drizzle-orm";
import crypto from "crypto";

export async function createUser(email: string, name: string) {
  try {
    const [user] = await db
      .insert(Users)
      .values({ email, name })
      .returning()
      .execute();
    return user;
  } catch (error) {
    console.error("Error creating user:", error);
    return null;
  }
}

export async function getUserByEmail(email: string) {
  try {
    const [user] = await db
      .select()
      .from(Users)
      .where(eq(Users.email, email))
      .execute();
    return user;
  } catch (error) {
    console.error("Error fetching user by email:", error);
    return null;
  }
}

export async function getUnreadNotifications(userId: number) {
  try {
    return await db
      .select()
      .from(Notifications)
      .where(
        and(eq(Notifications.userId, userId), eq(Notifications.isRead, false))
      )
      .execute();
  } catch (error) {
    console.error("Error fetching unread notifications:", error);
    return [];
  }
}

export async function getRewardTransactions(userId: number) {
  try {
    console.log("Fetching transactions for user ID:", userId);
    const transactions = await db
      .select({
        id: Transactions.id,
        type: Transactions.type,
        amount: Transactions.amount,
        description: Transactions.description,
        date: Transactions.date,
      })
      .from(Transactions)
      .where(eq(Transactions.userId, userId))
      .orderBy(desc(Transactions.date))
      .limit(10)
      .execute();

    console.log("Raw transactions from database:", transactions);

    const formattedTransactions = transactions.map((t) => ({
      ...t,
      date: t.date.toISOString().split("T")[0],
    }));

    console.log("Formatted transactions:", formattedTransactions);
    return formattedTransactions;
  } catch (error) {
    console.error("Error fetching reward transactions:", error);
    return [];
  }
}

export async function getUserBalance(userId: number): Promise<number> {
  const transactions = await getRewardTransactions(userId);
  const balance = transactions.reduce((acc, transaction) => {
    return transaction.type.startsWith("earned")
      ? acc + transaction.amount
      : acc - transaction.amount;
  }, 0);
  return Math.max(balance, 0);
}

export async function markNotificationAsRead(notificationId: number) {
  try {
    await db
      .update(Notifications)
      .set({ isRead: true })
      .where(eq(Notifications.id, notificationId))
      .execute();
  } catch (error) {
    console.error("Error marking notification as read:", error);
  }
}

export async function getRecentReports(limit: number = 10) {
  try {
    const reports = await db
      .select()
      .from(Reports)
      .orderBy(desc(Reports.createdAt))
      .limit(limit)
      .execute();
    return reports;
  } catch (error) {
    console.error("Error fetching recent reports:", error);
    return [];
  }
}

export async function createReport(
  userId: number,
  location: string,
  wasteType: string,
  amount: string,
  imageUrl?: string,
  type?: string,
  verificationResult?: any
) {
  try {
    const [report] = await db
      .insert(Reports)
      .values({
        userId,
        location,
        wasteType,
        amount,
        imageUrl,
        verificationResult,
        status: "pending",
      })
      .returning()
      .execute();

    // Award 10 points for reporting waste
    const pointsEarned: number = 10;
    await updateRewardPoints(userId, pointsEarned);

    // Create a transaction for the earned points
    await createTransaction(
      userId,
      "earned_report",
      pointsEarned,
      "Points earned for reporting waste"
    );

    // Create a notification for the user
    await createNotification(
      userId,
      `You've earned ${pointsEarned} points for reporting waste!`,
      "reward"
    );

    return report;
  } catch (error) {
    console.error("Error creating report:", error);
    return null;
  }
}

export async function updateRewardPoints(userId: number, points: number) {
  try {
    const [updatedRewardPoints] = await db
      .update(Rewards)
      .set({
        points: sql`${Rewards.points} + ${points}`,
      })
      .where(eq(Rewards.userId, userId))
      .returning()
      .execute();
    return updatedRewardPoints;
  } catch (error) {
    console.error("Error updating reward points:", error);
  }
}

export async function createTransaction(
  userId: number,
  type: "earned_report" | "earned_collect" | "redeemed" | "spent",
  amount: number,
  description: string
) {
  try {
    const [transaction] = await db
      .insert(Transactions)
      .values({
        userId,
        type,
        amount,
        description,
      })
      .returning()
      .execute();
    return transaction;
  } catch (error) {
    console.error("Error creating transaction:", error);
    return null;
  }
}

export async function createNotification(
  userId: number,
  message: string,
  type: string
) {
  try {
    const [notification] = await db
      .insert(Notifications)
      .values({ userId, message, type })
      .returning()
      .execute();
    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    return null;
  }
}

export async function getAvailableRewards(userId: number) {
  try {
    console.log("Fetching available rewards for user:", userId);

    // Get user's total points
    const userTransactions = await getRewardTransactions(userId);
    const userPoints = userTransactions.reduce((total, transaction) => {
      return transaction.type.startsWith("earned")
        ? total + transaction.amount
        : total - transaction.amount;
    }, 0);

    console.log("User total points:", userPoints);

    // Get available rewards from the database
    const dbRewards = await db
      .select({
        id: Rewards.id,
        name: Rewards.name,
        cost: Rewards.points,
        description: Rewards.description,
        collectionInfo: Rewards.collectionInfo,
      })
      .from(Rewards)
      .where(eq(Rewards.isAvailable, true))
      .execute();

    console.log("Rewards from database:", dbRewards);

    const allRewards = [
      {
        id: 0,
        name: "Your Points",
        cost: userPoints,
        description: "Redeem your earned points",
        collectionInfo: "Points earned from reporting and collecting waste",
      },
      ...dbRewards,
    ];

    console.log("All available rewards:", allRewards);
    return allRewards;
  } catch (error) {
    console.error("Error fetching available rewards:", error);
    return [];
  }
}

export async function getWasteCollectionTasks(limit: number = 20) {
  try {
    const tasks = await db
      .select({
        id: Reports.id,
        location: Reports.location,
        wasteType: Reports.wasteType,
        amount: Reports.amount,
        status: Reports.status,
        date: Reports.createdAt,
        collectorId: Reports.collectorId,
      })
      .from(Reports)
      .limit(limit)
      .execute();

    return tasks.map((task) => ({
      ...task,
      date: task.date.toISOString().split("T")[0], // Format date as YYYY-MM-DD
    }));
  } catch (error) {
    console.error("Error fetching waste collection tasks:", error);
    return [];
  }
}

export async function updateTaskStatus(
  reportId: number,
  newStatus: string,
  collectorId?: number
) {
  try {
    const updateData: any = { status: newStatus };
    if (collectorId !== undefined) {
      updateData.collectorId = collectorId;
    }
    const [updatedReport] = await db
      .update(Reports)
      .set(updateData)
      .where(eq(Reports.id, reportId))
      .returning()
      .execute();
    return updatedReport;
  } catch (error) {
    console.error("Error updating task status:", error);
    throw error;
  }
}

export async function saveReward(userId: number, amount: number) {
  try {
    const [reward] = await db
      .insert(Rewards)
      .values({
        userId,
        name: "Waste Collection Reward",
        collectionInfo: "Points earned from waste collection",
        points: amount,
        level: 1,
        isAvailable: true,
      })
      .returning()
      .execute();

    // Create a transaction for this reward
    await createTransaction(
      userId,
      "earned_collect",
      amount,
      "Points earned for collecting waste"
    );

    return reward;
  } catch (error) {
    console.error("Error saving reward:", error);
    throw error;
  }
}
export async function saveCollectedWaste(
  reportId: number,
  collectorId: number,
  verificationResult: any
) {
  try {
    const [collectedWaste] = await db
      .insert(CollectedWastes)
      .values({
        reportId,
        collectorId,
        collectionDate: new Date(),
        status: "verified",
      })
      .returning()
      .execute();
    return collectedWaste;
  } catch (error) {
    console.error("Error saving collected waste:", error);
    throw error;
  }
}
export async function getOrCreateReward(userId: number) {
  try {
    let [reward] = await db
      .select()
      .from(Rewards)
      .where(eq(Rewards.userId, userId))
      .execute();
    if (!reward) {
      [reward] = await db
        .insert(Rewards)
        .values({
          userId,
          name: "Default Reward",
          collectionInfo: "Default Collection Info",
          points: 0,
          level: 1,
          isAvailable: true,
        })
        .returning()
        .execute();
    }
    return reward;
  } catch (error) {
    console.error("Error getting or creating reward:", error);
    return null;
  }
}
export async function redeemReward(userId: number, rewardId: number) {
  try {
    const userReward = (await getOrCreateReward(userId)) as any;

    if (rewardId === 0) {
      // Redeem all points
      const [updatedReward] = await db
        .update(Rewards)
        .set({
          points: 0,
          updatedAt: new Date(),
        })
        .where(eq(Rewards.userId, userId))
        .returning()
        .execute();

      // Create a transaction for this redemption
      await createTransaction(
        userId,
        "redeemed",
        userReward.points,
        `Redeemed all points: ${userReward.points}`
      );

      return updatedReward;
    } else {
      // Existing logic for redeeming specific rewards
      const availableReward = await db
        .select()
        .from(Rewards)
        .where(eq(Rewards.id, rewardId))
        .execute();

      if (
        !userReward ||
        !availableReward[0] ||
        userReward.points < availableReward[0].points
      ) {
        throw new Error("Insufficient points or invalid reward");
      }

      const [updatedReward] = await db
        .update(Rewards)
        .set({
          points: sql`${Rewards.points} - ${availableReward[0].points}`,
          updatedAt: new Date(),
        })
        .where(eq(Rewards.userId, userId))
        .returning()
        .execute();

      // Create a transaction for this redemption
      await createTransaction(
        userId,
        "redeemed",
        availableReward[0].points,
        `Redeemed: ${availableReward[0].name}`
      );

      return updatedReward;
    }
  } catch (error) {
    console.error("Error redeeming reward:", error);
    throw error;
  }
}

export async function getAllRewards() {
  try {
    const rewards = await db
      .select({
        id: Rewards.id,
        userId: Rewards.userId,
        points: Rewards.points,
        level: Rewards.level,
        createdAt: Rewards.createdAt,
        userName: Users.name,
      })
      .from(Rewards)
      .leftJoin(Users, eq(Rewards.userId, Users.id))
      .orderBy(desc(Rewards.points))
      .execute();

    return rewards;
  } catch (error) {
    console.error("Error fetching all rewards:", error);
    return [];
  }
}

export async function updateUser(email: string, name: string, id: number) {
  try {
    const [updatedUser] = await db
      .update(Users)
      .set({ email, name })
      .where(eq(Users.id, id))
      .returning()
      .execute();
    return updatedUser;
  } catch (error) {
    console.error("Error updating user:", error);
  }
}

export async function isSameImage(
  file: File,
  location: string
): Promise<boolean | null> {
  try {
    const fileReader = new FileReader();

    // Generate hash of the file content
    const fileHash = await new Promise<string>((resolve, reject) => {
      fileReader.onload = () => {
        const hash = crypto
          .createHash("sha256")
          .update(fileReader.result as string)
          .digest("hex");
        resolve(hash);
      };
      fileReader.onerror = () => reject(fileReader.error);
      fileReader.readAsDataURL(file);
    });

    console.log("[isSameImage] File hash generated:", fileHash);

    // Retrieve potential matching records from the database
    const potentialMatches = await db
      .select()
      .from(Reports)
      .where(eq(Reports.location, location))
      .execute();

    for (const record of potentialMatches) {
      // Hash the stored imageUrl from the database
      const storedHash = crypto
        .createHash("sha256")
        .update(record.imageUrl || "")
        .digest("hex");

      if (storedHash === fileHash) {
        console.log("[isSameImage] Match found for both image and location.");
        return false; // Image and location match
      }
    }

    console.log("[isSameImage] No match found for image or location.");
    return true; // No match found
  } catch (error) {
    console.error("[isSameImage] Error during execution:", error);
    return null; // Handle errors gracefully
  }
}
export async function getCoupons(userId: number) {
  try {
    const coupons = await db
      .select()
      .from(Coupons)
      .where(eq(Coupons.userId, userId))
      .execute();
    return coupons;
  } catch (error) {
    console.error("Error fetching coupons:", error);
    throw new Error("Failed to fetch coupons. Please try again.");
  }
}

export async function createCoupon(
  discount: number, // Ensure the discount is passed as an integer
  expiry: Date,
  userId: number
) {
  try {
    // Ensure discount is an integer
    const validDiscount = Math.floor(discount);

    // Generate a unique coupon code
    const couponCode = `COUPON-${Date.now()}-${Math.random()
      .toString(30)
      .substring(2, 9)}`;

    // Save the coupon in the database
    const [createdCoupon] = await db
      .insert(Coupons)
      .values({
        code: couponCode,
        discount: validDiscount,
        expiry: expiry,
        userId,
      })
      .returning()
      .execute();

    return createdCoupon;
  } catch (error) {
    console.error("Error creating coupon:", error);
    throw new Error("Failed to create coupon. Please try again.");
  }
}

export async function redeemAllPoints(userId: number) {
  try {
    // Retrieve user reward points
    const userReward = await getOrCreateReward(userId);

    if (!userReward || userReward.points <= 0) {
      throw new Error("No points available to redeem.");
    }

    // Update the reward points to 0
    const [updatedReward] = await db
      .update(Rewards)
      .set({
        points: 0,
        updatedAt: new Date(),
      })
      .where(eq(Rewards.userId, userId))
      .returning()
      .execute();

    // Create a transaction for this redemption
    await createTransaction(
      userId,
      "redeemed",
      userReward.points,
      `Redeemed all points: ${userReward.points}`
    );

    return updatedReward;
  } catch (error) {
    console.error("Error redeeming all points:", error);
    throw error;
  }
}
