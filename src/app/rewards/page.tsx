"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  Gift,
  AlertCircle,
  Loader,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getUserByEmail,
  getRewardTransactions,
  getAvailableRewards,
  redeemReward,
  createTransaction,
  createCoupon,
  redeemAllPoints,
  getCoupons,
} from "@/utils/db/actions";
import { toast } from "react-hot-toast";
function getItemWithExpiry(key: string): string | null {
  const itemStr = localStorage.getItem(key);

  if (!itemStr) return null;

  const item = JSON.parse(itemStr);
  const now = new Date();

  if (now.getTime() > item.expiry) {
    localStorage.removeItem(key);
    toast.error("Session expired. Please login again. 😕");
    return null;
  }

  return item.value;
}
type Transaction = {
  id: number;
  type: "earned_report" | "earned_collect" | "redeemed";
  amount: number;
  description: string;
  date: string;
};

type Reward = {
  id: number;
  name: string;
  cost: number;
  description: string | null;
  collectionInfo: string;
};

export default function RewardsPage() {
  const [showCoupon, setShowCoupon] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [expiry, setExpiry] = useState(new Date());

  const [user, setUser] = useState<{
    id: number;
    email: string;
    name: string;
  } | null>(null);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [allCoupons, setAllCoupons] = useState<
    { id: number; code: string; discount: number; expiry: string }[]
  >([]);

  const fetchAllCoupons = useCallback(async () => {
    if (!user) {
      toast.error("Please log in to view your coupons.");
      return;
    }
    try {
      const coupons = await getCoupons(user.id);
      setAllCoupons(
        coupons.map((coupon) => ({
          ...coupon,
          expiry: coupon.expiry.toISOString(),
        }))
      );
    } catch (error) {
      console.error("Error fetching coupons:", error);
      toast.error("Failed to fetch coupons. Please try again.");
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchAllCoupons();
    }
  }, [user, fetchAllCoupons]);

  useEffect(() => {
    const fetchUserDataAndRewards = async () => {
      setLoading(true);
      try {
        const userEmail = getItemWithExpiry("userEmail");
        if (userEmail) {
          const fetchedUser = await getUserByEmail(userEmail);
          if (fetchedUser) {
            setUser(fetchedUser);
            const fetchedTransactions = await getRewardTransactions(
              fetchedUser.id
            );
            setTransactions(fetchedTransactions as Transaction[]);
            const fetchedRewards = await getAvailableRewards(fetchedUser.id);
            setRewards(fetchedRewards.filter((r) => r.cost > 0)); // Filter out rewards with 0 points
            const calculatedBalance = fetchedTransactions.reduce(
              (acc, transaction) => {
                return transaction.type.startsWith("earned")
                  ? acc + transaction.amount
                  : acc - transaction.amount;
              },
              0
            );
            setBalance(Math.max(calculatedBalance, 0)); // Ensure balance is never negative
          } else {
            toast.error("User not found. Please log in again.");
          }
        } else {
          toast.error("User not logged in. Please log in.");
        }
      } catch (error) {
        console.error("Error fetching user data and rewards:", error);
        toast.error("Failed to load rewards data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserDataAndRewards();
  }, []);

  const handleRedeemRewards = async (rewardId: number) => {
    if (!user) {
      toast.error("Please log in to redeem rewards.");
      return;
    }

    const reward = rewards.find((r) => r.id === rewardId);
    if (reward && balance >= reward.cost && reward.cost > 0) {
      try {
        if (balance < reward.cost) {
          toast.error("Insufficient balance to redeem this reward");
          return;
        }

        // Update database
        await redeemReward(user.id, rewardId);

        // Create a new transaction record
        await createTransaction(
          user.id,
          "redeemed",
          reward.cost,
          `Redeemed ${reward.name}`
        );

        // Create a coupon after successful redemption
        const createdCoupon = await createCoupon(
          reward.cost * 0.1,
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          user.id
        );

        // Update state with coupon details
        setCouponCode(createdCoupon.code);
        setDiscount(createdCoupon.discount);
        setExpiry(new Date(createdCoupon.expiry));
        setShowCoupon(true);

        // Refresh user data and rewards after redemption
        await refreshUserData();

        toast.success(`You have successfully redeemed: ${reward.name}`);
      } catch (error) {
        console.error("Error redeeming reward:", error);
        toast.error("Failed to redeem reward. Please try again.");
      }
    } else {
      toast.error("Insufficient balance or invalid reward cost");
    }
  };

  const handleRedeemAllPoints = async () => {
    if (!user) {
      toast.error("Please log in to redeem rewards.");
      return;
    }

    if (balance > 0) {
      try {
        // Update database
        await redeemAllPoints(user.id);

        // Create a new transaction record
        await createTransaction(
          user.id,
          "redeemed",
          balance,
          "Redeemed all points"
        );

        // Create a coupon after successful redemption
        const createdCoupon = await createCoupon(
          balance * 0.1,
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          user.id
        );

        // Update state with coupon details
        setCouponCode(createdCoupon.code);
        setDiscount(createdCoupon.discount);
        setExpiry(new Date(createdCoupon.expiry));
        setShowCoupon(true);

        // Refresh user data and rewards after redemption
        await refreshUserData();

        toast.success("You have successfully redeemed all points.");
      } catch (error) {
        console.error("Error redeeming all points:", error);
        toast.error("Failed to redeem all points. Please try again.");
      }
    } else {
      toast.error("No points to redeem.");
    }
  };

  const refreshUserData = async () => {
    if (user) {
      const fetchedUser = await getUserByEmail(user.email);
      if (fetchedUser) {
        const fetchedTransactions = await getRewardTransactions(fetchedUser.id);
        setTransactions(fetchedTransactions as Transaction[]);
        const fetchedRewards = await getAvailableRewards(fetchedUser.id);
        setRewards(fetchedRewards.filter((r) => r.cost > 0)); // Filter out rewards with 0 points

        // Recalculate balance
        const calculatedBalance = fetchedTransactions.reduce(
          (acc, transaction) => {
            return transaction.type.startsWith("earned")
              ? acc + transaction.amount
              : acc - transaction.amount;
          },
          0
        );
        setBalance(Math.max(calculatedBalance, 0)); // Ensure balance is never negative
      }
    }
  };

  const handleRedeemReward = async (rewardId: number) => {
    if (!user) {
      toast.error("Please log in to redeem rewards.");
      return;
    }

    const reward = rewards.find((r) => r.id === rewardId);
    if (reward && balance >= reward.cost && reward.cost > 0) {
      try {
        if (balance < reward.cost) {
          toast.error("Insufficient balance to redeem this reward");
          return;
        }

        // Update database
        await redeemReward(user.id, rewardId);

        // Create a new transaction record
        await createTransaction(
          user.id,
          "redeemed",
          reward.cost,
          `Redeemed ${reward.name}`
        );

        // Refresh user data and rewards after redemption
        await refreshUserData();

        toast.success(`You have successfully redeemed: ${reward.name}`);
      } catch (error) {
        console.error("Error redeeming reward:", error);
        toast.error("Failed to redeem reward. Please try again.");
      }
    } else {
      toast.error("Insufficient balance or invalid reward cost");
    }
  };
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader className="animate-spin h-8 w-8 text-gray-600" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-12">
      {/* Header */}
      <header className="text-center">
        <h1 className="text-4xl font-bold text-gray-900">Rewards</h1>
      </header>

      {/* Reward Balance */}
      <section className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-green-500 transform hover:scale-105 transition-transform duration-300">
        <h2 className="text-2xl font-semibold text-gray-800">Reward Balance</h2>
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center">
            <Coins className="w-12 h-12 text-green-500 mr-4" />
            <div>
              <p className="text-4xl font-bold text-green-500">{balance}</p>
              <p className="text-sm text-gray-500">Available Points</p>
            </div>
          </div>
        </div>
      </section>

      {/* Content Sections */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Recent Transactions */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Recent Transactions
          </h2>
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {transactions.length > 0 ? (
              transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition duration-200"
                >
                  <div className="flex items-center">
                    {transaction.type === "earned_report" ? (
                      <ArrowUpRight className="w-5 h-5 text-green-500 mr-3" />
                    ) : transaction.type === "earned_collect" ? (
                      <ArrowUpRight className="w-5 h-5 text-blue-500 mr-3" />
                    ) : (
                      <ArrowDownRight className="w-5 h-5 text-red-500 mr-3" />
                    )}
                    <div>
                      <p className="font-medium text-gray-800">
                        {transaction.description}
                      </p>
                      <p className="text-sm text-gray-500">
                        {transaction.date}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`font-semibold ${
                      transaction.type.startsWith("earned")
                        ? "text-green-500"
                        : "text-red-500"
                    }`}
                  >
                    {transaction.type.startsWith("earned") ? "+" : "-"}
                    {transaction.amount}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 p-4 text-center">
                No transactions yet.
              </p>
            )}
          </div>
        </section>

        {/* Available Rewards */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Available Rewards
          </h2>
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {rewards.length > 0 ? (
              rewards.map((reward) => (
                <div
                  key={reward.id}
                  className={`flex items-center justify-between p-4 border-b border-gray-200 last:border-b-0 ${
                    reward.name === "Your Points"
                      ? "bg-yellow-100 border-yellow-300 hover:bg-yellow-200"
                      : "hover:bg-gray-50"
                  } transition duration-200`}
                >
                  <div className="flex items-center">
                    <Gift className="w-6 h-6 text-gray-800 mr-3" />
                    <div>
                      <p className="font-medium text-gray-800">{reward.name}</p>
                      <p className="text-sm text-gray-500">
                        {reward.collectionInfo}
                      </p>
                    </div>
                  </div>
                  <div>
                    {reward.name === "Your Points" ? (
                      <Button
                        onClick={() => handleRedeemRewards(reward.id)}
                        variant="default"
                        className="border-green-950"
                      >
                        Redeem to Get Coupon <strong>{reward.cost}</strong>
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleRedeemReward(reward.id)}
                        disabled={balance < reward.cost}
                        variant="outline"
                        className="border-gray-800"
                      >
                        Redeem <strong>{reward.cost}</strong>
                      </Button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 p-4 text-center">
                No rewards available.
              </p>
            )}
          </div>
        </section>
      </div>

      {/* Coupon Section */}
      {showCoupon && (
        <section className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-green-500 transform hover:scale-105 transition-transform duration-300">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Your Coupon
          </h2>
          <div className="flex items-center">
            <Gift className="w-10 h-10 text-green-500 mr-4" />
            <div>
              <p className="text-lg font-bold text-green-500">{couponCode}</p>
              <p className="text-sm text-gray-500">
                {discount}% off until {expiry.toLocaleDateString()}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* All Coupons */}
      <section>
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          All Coupons
        </h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {allCoupons
            .filter((coupon) => coupon.discount > 0)
            .map((coupon) => (
              <div
                key={coupon.id}
                className="bg-white p-4 rounded-lg shadow-lg flex flex-col items-center relative hover:shadow-xl transition-shadow duration-200"
              >
                <Gift className="w-8 h-8 text-green-500 mb-2" />
                <p className="text-lg font-bold text-green-500">
                  {coupon.code}
                </p>
                <p className="text-sm text-gray-500">
                  {coupon.discount}% off until{" "}
                  {new Date(coupon.expiry).toLocaleDateString()}
                </p>
                <button
                  className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                  onClick={() => navigator.clipboard.writeText(coupon.code)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
                  </svg>
                </button>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}
