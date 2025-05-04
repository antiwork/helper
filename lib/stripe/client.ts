import Stripe from "stripe";
import { env } from "@/lib/env";

export const stripe = env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY) : null;
