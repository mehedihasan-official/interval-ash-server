import { Request, Response } from 'express';
import { FilterQuery } from 'mongoose';
import { FlightModel, IFlight } from '../models/flight.model';
import { AppError } from '../utils/app-error';
import { catchAsync } from '../utils/catch-async';
import { sendResponse } from '../utils/send-response';
import { calculateFlightPricing } from '../utils/flight-pricing';

/**
 * Attach the derived member/points pricing to a flight document.
 * We do this on the server so every caller (results list, detail page,
 * booking creator) reads the same numbers instead of each recomputing
 * them and drifting apart.
 */
function withPricing(flight: IFlight) {
  const pricing = calculateFlightPricing(flight.retailPrice);
  return { ...flight.toObject(), pricing };
}

/**
 * GET /api/flights
 *
 * Search flights by origin/destination and optional filters. When the
 * exact route has no matches the endpoint falls back to returning every
 * flight, so the member always sees something they can browse — the
 * client already displays a "showing all available flights" hint in
 * that case so the fallback is visible, not hidden.
 */
export const searchFlights = catchAsync(async (req: Request, res: Response) => {
  const origin = String(req.query.origin || '').trim().toUpperCase();
  const destination = String(req.query.destination || '').trim().toUpperCase();
  const cabinClass = String(req.query.cabinClass || '').trim();
  const airline = String(req.query.airline || '').trim();
  const stops = String(req.query.stops || '').trim();
  const refundableOnly = String(req.query.refundable || '').toLowerCase() === 'true';

  const parsedMinPrice = Number(req.query.minPrice);
  const parsedMaxPrice = Number(req.query.maxPrice);

  const buildFilter = (matchRoute: boolean): FilterQuery<IFlight> => {
    const filter: FilterQuery<IFlight> = {};
    if (matchRoute) {
      if (origin) filter.origin = origin;
      if (destination) filter.destination = destination;
    }
    if (cabinClass) filter.cabinClass = cabinClass;
    if (airline) filter.airline = airline;
    if (refundableOnly) filter.refundable = true;

    if (stops === 'nonstop') filter.stops = 0;
    else if (stops === '1stop') filter.stops = 1;
    else if (stops === '2plus') filter.stops = { $gte: 2 };

    if (!Number.isNaN(parsedMinPrice) || !Number.isNaN(parsedMaxPrice)) {
      const price: Record<string, number> = {};
      if (!Number.isNaN(parsedMinPrice)) price.$gte = parsedMinPrice;
      if (!Number.isNaN(parsedMaxPrice)) price.$lte = parsedMaxPrice;
      filter.retailPrice = price;
    }
    return filter;
  };

  let flights = await FlightModel.find(buildFilter(true));
  let exactMatch = true;

  if (flights.length === 0 && (origin || destination)) {
    // No flight on this exact route — show everything else that still
    // matches the traveler's other filters so the results list isn't
    // empty and the search still feels responsive.
    flights = await FlightModel.find(buildFilter(false));
    exactMatch = false;
  }

  sendResponse(res, 200, 'Flights retrieved successfully', {
    flights: flights.map(withPricing),
    exactMatch,
    total: flights.length,
  });
});

/**
 * GET /api/flights/:id
 *
 * Fetch a single flight (by either its Mongo `_id` or the human-readable
 * `flightId` we assigned at seed time). Both are accepted because
 * different call sites have different pieces of information handy — the
 * search page holds `_id`, the confirmation page holds the human id.
 */
export const getFlightById = catchAsync(async (req: Request, res: Response) => {
  const id = String(req.params.id || '').trim();
  if (!id) throw new AppError('Flight id is required', 400);

  const filter: FilterQuery<IFlight> = /^[a-f0-9]{24}$/i.test(id)
    ? { $or: [{ _id: id }, { flightId: id }] }
    : { flightId: id };

  const flight = await FlightModel.findOne(filter);
  if (!flight) throw new AppError('Flight not found', 404);

  sendResponse(res, 200, 'Flight retrieved successfully', withPricing(flight));
});

/**
 * POST /api/flights (admin)
 * Create a new flight offering. Admin-only so members can't seed
 * arbitrary inventory into the search results.
 */
export const createFlight = catchAsync(async (req: Request, res: Response) => {
  const body = req.body;
  if (!body || Object.keys(body).length === 0) {
    throw new AppError('Flight data cannot be empty', 400);
  }
  const created = await FlightModel.create(body);
  sendResponse(res, 201, 'Flight created successfully', withPricing(created));
});

/**
 * PATCH /api/flights/:id (admin)
 */
export const updateFlight = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updated = await FlightModel.findByIdAndUpdate(
    id,
    { $set: req.body },
    { new: true, runValidators: true }
  );
  if (!updated) throw new AppError('Flight not found', 404);
  sendResponse(res, 200, 'Flight updated successfully', withPricing(updated));
});

/**
 * DELETE /api/flights/:id (admin)
 */
export const deleteFlight = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const deleted = await FlightModel.findByIdAndDelete(id);
  if (!deleted) throw new AppError('Flight not found', 404);
  sendResponse(res, 200, 'Flight deleted successfully', deleted);
});
