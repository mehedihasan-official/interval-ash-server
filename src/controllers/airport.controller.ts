import { Request, Response } from 'express';
import { FilterQuery } from 'mongoose';
import { AirportModel, IAirport } from '../models/airport.model';
import { AppError } from '../utils/app-error';
import { catchAsync } from '../utils/catch-async';
import { sendResponse } from '../utils/send-response';

/**
 * GET /api/airports
 *
 * Backs the airport autocomplete on the flight search form. Callers
 * pass a `search` query string (an IATA code, city name, or airport
 * name fragment) and get back a short list of matches. When no search
 * value is provided we still return the first page of airports so an
 * empty dropdown doesn't feel broken; a `limit` is enforced either way
 * because the collection has ~800 documents and the dropdown only shows
 * a handful at a time.
 */
export const searchAirports = catchAsync(async (req: Request, res: Response) => {
  const search = String(req.query.search || '').trim();
  const parsedLimit = Number.parseInt(String(req.query.limit), 10);
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0
    ? Math.min(parsedLimit, 50)
    : 10;

  const filter: FilterQuery<IAirport> = {};
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    filter.$or = [{ code: regex }, { city: regex }, { name: regex }];
  }

  const airports = await AirportModel.find(filter).sort({ city: 1 }).limit(limit);
  sendResponse(res, 200, 'Airports retrieved successfully', airports);
});

/**
 * GET /api/airports/:code
 *
 * Look up a single airport by its IATA code. Used server-side (e.g. when
 * a search request wants to include the resolved city/country) and by
 * confirmation pages that show the full airport name next to the code.
 */
export const getAirportByCode = catchAsync(async (req: Request, res: Response) => {
  const code = String(req.params.code || '').trim().toUpperCase();
  if (!code) {
    throw new AppError('Airport code is required', 400);
  }

  const airport = await AirportModel.findOne({ code });
  if (!airport) {
    throw new AppError('Airport not found', 404);
  }

  sendResponse(res, 200, 'Airport retrieved successfully', airport);
});

/**
 * POST /api/airports (admin)
 *
 * Add an airport to the reference list the flight search autocompletes
 * against. Admin-only: this is shared reference data, and a bad entry
 * here shows up in every member's search box.
 *
 * A flight can only be created between airports that already exist here
 * (see createFlight), so this is the first step when opening up a new
 * destination.
 */
export const createAirport = catchAsync(async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const code = String(body.code ?? '').trim().toUpperCase();
  const city = String(body.city ?? '').trim();
  const name = String(body.name ?? '').trim();
  const country = String(body.country ?? '').trim();

  const missing = [
    !code && 'code',
    !city && 'city',
    !name && 'name',
    !country && 'country',
  ].filter(Boolean);
  if (missing.length > 0) {
    throw new AppError(
      `Airport ${missing.join(', ')} ${missing.length > 1 ? 'are' : 'is'} required`,
      400,
    );
  }

  if (!/^[A-Z]{3}$/.test(code)) {
    throw new AppError(
      'Airport code must be a 3-letter IATA code, for example MYR',
      400,
    );
  }

  // Checked up front so the admin gets "MYR is already Myrtle Beach
  // International" instead of the generic unique-index collision.
  const existing = await AirportModel.findOne({ code });
  if (existing) {
    throw new AppError(
      `${code} already exists — it is ${existing.name} in ${existing.city}.`,
      409,
    );
  }

  // Coordinates are optional, but both or neither — half a coordinate
  // pair is worse than none, because it silently reads as (lat, 0).
  const latitude = body.latitude === '' || body.latitude == null ? null : Number(body.latitude);
  const longitude = body.longitude === '' || body.longitude == null ? null : Number(body.longitude);
  if ((latitude === null) !== (longitude === null)) {
    throw new AppError('Give both latitude and longitude, or neither', 400);
  }
  if (latitude !== null && longitude !== null) {
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      throw new AppError('Latitude must be a number between -90 and 90', 400);
    }
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      throw new AppError('Longitude must be a number between -180 and 180', 400);
    }
  }

  const created = await AirportModel.create({
    code,
    city,
    name,
    country,
    ...(latitude !== null && longitude !== null ? { latitude, longitude } : {}),
  });
  sendResponse(res, 201, 'Airport created successfully', created);
});
