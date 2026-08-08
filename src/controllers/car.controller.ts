import { Request, Response } from 'express';
import { FilterQuery } from 'mongoose';
import { CarModel, ICar } from '../models/car.model';
import { AppError } from '../utils/app-error';
import { catchAsync } from '../utils/catch-async';
import { sendResponse } from '../utils/send-response';
import {
  CAR_ADDON_PRICING,
  calculateCarPricing,
  type CarPricingResult,
} from '../utils/car-pricing';

interface PlainCar {
  _id: unknown;
  carId: string;
  type: string;
  category: string;
  brand: string;
  image?: string;
  passengers: number;
  transmission: 'Automatic' | 'Manual';
  bags: number;
  mileagePolicy: string;
  freeMilesPerDay: number;
  overageRatePerMile: number;
  fuelType: string;
  airConditioning: boolean;
  vendor: string;
  vendorLogo?: string;
  rating: number;
  reviewCount: number;
  retailPricePerDay: number;
  features: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

// Parses rentalDays/estimatedDailyMiles from the query so the search
// response can pre-price every car for the traveler's exact trip. If
// the caller doesn't send them we use sensible defaults (1 day, no
// mileage overage) so the endpoint still works for basic browsing.
function parsePricingParams(req: Request): {
  rentalDays: number;
  estimatedDailyMiles: number;
} {
  const parsedDays = Number.parseInt(String(req.query.rentalDays), 10);
  const parsedMiles = Number.parseInt(String(req.query.estimatedDailyMiles), 10);
  return {
    rentalDays: Number.isFinite(parsedDays) && parsedDays > 0 ? parsedDays : 1,
    estimatedDailyMiles:
      Number.isFinite(parsedMiles) && parsedMiles > 0 ? parsedMiles : 0,
  };
}

function priceCar(
  car: PlainCar,
  rentalDays: number,
  estimatedDailyMiles: number,
): PlainCar & { pricing: CarPricingResult } {
  const pricing = calculateCarPricing({
    retailPricePerDay: car.retailPricePerDay,
    rentalDays,
    freeMilesPerDay: car.freeMilesPerDay,
    overageRatePerMile: car.overageRatePerMile,
    estimatedDailyMiles,
    addOns: {
      insurance: false,
      gps: false,
      childSeat: false,
      additionalDriver: false,
    },
  });
  return { ...car, pricing };
}

/**
 * GET /api/cars
 *
 * Browse cars filtered by category, vendor, and per-day price. The
 * response attaches a pre-computed pricing block for the trip length
 * (rentalDays, estimatedDailyMiles) sent in the query, so the results
 * grid can render the traveler's true total without a second round
 * trip to the server.
 */
export const searchCars = catchAsync(async (req: Request, res: Response) => {
  const category = String(req.query.category || '').trim().toLowerCase();
  const vendor = String(req.query.vendor || '').trim();
  const transmission = String(req.query.transmission || '').trim();
  const parsedMinPrice = Number(req.query.minPrice);
  const parsedMaxPrice = Number(req.query.maxPrice);
  const { rentalDays, estimatedDailyMiles } = parsePricingParams(req);

  const filter: FilterQuery<ICar> = {};
  if (category) filter.category = category;
  if (vendor) filter.vendor = vendor;
  if (transmission) filter.transmission = transmission;
  if (!Number.isNaN(parsedMinPrice) || !Number.isNaN(parsedMaxPrice)) {
    const price: Record<string, number> = {};
    if (!Number.isNaN(parsedMinPrice)) price.$gte = parsedMinPrice;
    if (!Number.isNaN(parsedMaxPrice)) price.$lte = parsedMaxPrice;
    filter.retailPricePerDay = price;
  }

  const cars = await CarModel.find(filter)
    .sort({ retailPricePerDay: 1 })
    .lean<PlainCar[]>();

  sendResponse(res, 200, 'Cars retrieved successfully', {
    cars: cars.map((car) => priceCar(car, rentalDays, estimatedDailyMiles)),
    total: cars.length,
    rentalDays,
    estimatedDailyMiles,
    addOnPricing: CAR_ADDON_PRICING,
  });
});

/**
 * GET /api/cars/:id
 * Look up a single car by Mongo _id or by human `carId`.
 */
export const getCarById = catchAsync(async (req: Request, res: Response) => {
  const id = String(req.params.id || '').trim();
  if (!id) throw new AppError('Car id is required', 400);

  const filter: FilterQuery<ICar> = /^[a-f0-9]{24}$/i.test(id)
    ? { $or: [{ _id: id }, { carId: id }] }
    : { carId: id };

  const car = await CarModel.findOne(filter).lean<PlainCar | null>();
  if (!car) throw new AppError('Car not found', 404);

  const { rentalDays, estimatedDailyMiles } = parsePricingParams(req);
  sendResponse(
    res,
    200,
    'Car retrieved successfully',
    priceCar(car, rentalDays, estimatedDailyMiles),
  );
});

/**
 * POST /api/cars (admin)
 */
export const createCar = catchAsync(async (req: Request, res: Response) => {
  const body = req.body;
  if (!body || Object.keys(body).length === 0) {
    throw new AppError('Car data cannot be empty', 400);
  }
  const created = await CarModel.create(body);
  sendResponse(res, 201, 'Car created successfully', created);
});

/**
 * PATCH /api/cars/:id (admin)
 */
export const updateCar = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updated = await CarModel.findByIdAndUpdate(
    id,
    { $set: req.body },
    { new: true, runValidators: true },
  );
  if (!updated) throw new AppError('Car not found', 404);
  sendResponse(res, 200, 'Car updated successfully', updated);
});

/**
 * DELETE /api/cars/:id (admin)
 */
export const deleteCar = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const deleted = await CarModel.findByIdAndDelete(id);
  if (!deleted) throw new AppError('Car not found', 404);
  sendResponse(res, 200, 'Car deleted successfully', deleted);
});
