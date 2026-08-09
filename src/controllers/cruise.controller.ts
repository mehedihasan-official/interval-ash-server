import { Request, Response } from 'express';
import { FilterQuery } from 'mongoose';
import { CruiseModel, ICruise, CabinKey } from '../models/cruise.model';
import { AppError } from '../utils/app-error';
import { catchAsync } from '../utils/catch-async';
import { sendResponse } from '../utils/send-response';
import {
  CRUISE_ADDON_PRICING,
  calculateCruisePricing,
  type CruisePricingResult,
} from '../utils/cruise-pricing';

interface PlainCruise {
  _id: unknown;
  cruiseId: string;
  name: string;
  cruiseLine: string;
  cruiseLineLogo?: string;
  route: string;
  departurePort: string;
  duration: number;
  category: string;
  image?: string;
  rating: number;
  reviews: number;
  itinerary: string[];
  shipFeatures: string[];
  cabinTypes: Record<CabinKey, { name: string; retailPrice: number }>;
  departureDates: string[];
  includes: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

interface PricingParams {
  cabinType: CabinKey;
  adults: number;
  children: number;
  infants: number;
}

function parsePricingParams(req: Request): PricingParams {
  const cabinRaw = String(req.query.cabinType || 'inside').toLowerCase();
  const cabinType: CabinKey = ['inside', 'outside', 'balcony', 'suite'].includes(
    cabinRaw,
  )
    ? (cabinRaw as CabinKey)
    : 'inside';
  const parseInt10 = (value: string | null | undefined, fallback: number) => {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  };
  return {
    cabinType,
    adults: Math.max(1, parseInt10(String(req.query.adults), 2)),
    children: parseInt10(String(req.query.children), 0),
    infants: parseInt10(String(req.query.infants), 0),
  };
}

function priceCruise(
  cruise: PlainCruise,
  params: PricingParams,
): PlainCruise & {
  pricing: CruisePricingResult;
  selectedCabin: CabinKey;
} {
  const cabin = cruise.cabinTypes[params.cabinType];
  const pricing = calculateCruisePricing({
    cabinRetailPrice: cabin.retailPrice,
    cabinType: params.cabinType,
    nights: cruise.duration,
    adults: params.adults,
    children: params.children,
    infants: params.infants,
    addOns: {
      travelInsurance: false,
      drinkPackage: false,
      wifiPackage: false,
      excursionPackage: false,
    },
  });
  return { ...cruise, pricing, selectedCabin: params.cabinType };
}

/**
 * GET /api/cruises
 *
 * Browse cruises filtered by destination category (Caribbean, Alaska,
 * etc.), departure port, cruise line and trip length. Each result is
 * pre-priced for the requested party size + cabin type so the results
 * grid can render true totals without another round trip.
 */
export const searchCruises = catchAsync(async (req: Request, res: Response) => {
  const category = String(req.query.category || '').trim();
  const cruiseLine = String(req.query.cruiseLine || '').trim();
  const departurePort = String(req.query.departurePort || '').trim();
  const parsedMinDuration = Number(req.query.minDuration);
  const parsedMaxDuration = Number(req.query.maxDuration);

  const filter: FilterQuery<ICruise> = {};
  if (category) filter.category = new RegExp(`^${category}$`, 'i');
  if (cruiseLine) filter.cruiseLine = cruiseLine;
  if (departurePort) {
    // Match either exact port or by city prefix ("Miami" → "Miami, FL").
    filter.departurePort = new RegExp(
      departurePort.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      'i',
    );
  }
  if (!Number.isNaN(parsedMinDuration) || !Number.isNaN(parsedMaxDuration)) {
    const duration: Record<string, number> = {};
    if (!Number.isNaN(parsedMinDuration)) duration.$gte = parsedMinDuration;
    if (!Number.isNaN(parsedMaxDuration)) duration.$lte = parsedMaxDuration;
    filter.duration = duration;
  }

  const pricingParams = parsePricingParams(req);
  const cruises = await CruiseModel.find(filter)
    .sort({ 'cabinTypes.inside.retailPrice': 1 })
    .lean<PlainCruise[]>();

  sendResponse(res, 200, 'Cruises retrieved successfully', {
    cruises: cruises.map((cruise) => priceCruise(cruise, pricingParams)),
    total: cruises.length,
    pricingParams,
    addOnPricing: CRUISE_ADDON_PRICING,
  });
});

/** GET /api/cruises/:id — accepts Mongo _id or human cruiseId. */
export const getCruiseById = catchAsync(async (req: Request, res: Response) => {
  const id = String(req.params.id || '').trim();
  if (!id) throw new AppError('Cruise id is required', 400);
  const filter: FilterQuery<ICruise> = /^[a-f0-9]{24}$/i.test(id)
    ? { $or: [{ _id: id }, { cruiseId: id }] }
    : { cruiseId: id };
  const cruise = await CruiseModel.findOne(filter).lean<PlainCruise | null>();
  if (!cruise) throw new AppError('Cruise not found', 404);
  const pricingParams = parsePricingParams(req);
  sendResponse(
    res,
    200,
    'Cruise retrieved successfully',
    priceCruise(cruise, pricingParams),
  );
});

/** GET /api/cruises/meta/categories — for populating the filter dropdown. */
export const getCruiseCategories = catchAsync(
  async (_req: Request, res: Response) => {
    const categories = await CruiseModel.distinct('category');
    const ports = await CruiseModel.distinct('departurePort');
    const cruiseLines = await CruiseModel.distinct('cruiseLine');
    sendResponse(res, 200, 'Cruise metadata retrieved successfully', {
      categories: (categories as string[]).sort(),
      departurePorts: (ports as string[]).sort(),
      cruiseLines: (cruiseLines as string[]).sort(),
    });
  },
);

/** POST /api/cruises (admin) */
export const createCruise = catchAsync(async (req: Request, res: Response) => {
  const body = req.body;
  if (!body || Object.keys(body).length === 0) {
    throw new AppError('Cruise data cannot be empty', 400);
  }
  const created = await CruiseModel.create(body);
  sendResponse(res, 201, 'Cruise created successfully', created);
});

/** PATCH /api/cruises/:id (admin) */
export const updateCruise = catchAsync(async (req: Request, res: Response) => {
  const updated = await CruiseModel.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true },
  );
  if (!updated) throw new AppError('Cruise not found', 404);
  sendResponse(res, 200, 'Cruise updated successfully', updated);
});

/** DELETE /api/cruises/:id (admin) */
export const deleteCruise = catchAsync(async (req: Request, res: Response) => {
  const deleted = await CruiseModel.findByIdAndDelete(req.params.id);
  if (!deleted) throw new AppError('Cruise not found', 404);
  sendResponse(res, 200, 'Cruise deleted successfully', deleted);
});
