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
