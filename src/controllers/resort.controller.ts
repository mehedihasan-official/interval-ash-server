import { Request, Response } from 'express';
import { FilterQuery } from 'mongoose';
import { ResortModel } from '../models/resort.model';
import { catchAsync } from '../utils/catch-async';
import { sendResponse } from '../utils/send-response';
import { AppError } from '../utils/app-error';

/**
 * GET /api/resorts
 * Fetch resorts with optional filtering, search, and pagination.
 */
export const getAllResorts = catchAsync(async (req: Request, res: Response) => {
  const search = String(req.query.search || '').trim();
  const location = String(req.query.location || '').trim();
  const minPrice = Number(req.query.minPrice);
  const maxPrice = Number(req.query.maxPrice);
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));

  const filter: FilterQuery<typeof ResortModel> = {};
  const clauses: FilterQuery<typeof ResortModel>[] = [];

  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = new RegExp(escaped, 'i');
    clauses.push({
      $or: [
        { name: searchRegex },
        { location: searchRegex },
        { description: searchRegex },
        { country: searchRegex },
        { region: searchRegex },
        { resortName: searchRegex },
        { place_name: searchRegex },
        { symbol: searchRegex },
      ],
    });
  }

  if (location) {
    const escaped = location.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const locationRegex = new RegExp(escaped, 'i');
    clauses.push({
      $or: [
        { location: locationRegex },
        { country: locationRegex },
        { region: locationRegex },
      ],
    });
  }

  if (!Number.isNaN(minPrice) || !Number.isNaN(maxPrice)) {
    const priceFilter: FilterQuery<typeof ResortModel> = {};
    if (!Number.isNaN(minPrice)) {
      priceFilter.$gte = minPrice;
    }
    if (!Number.isNaN(maxPrice)) {
      priceFilter.$lte = maxPrice;
    }
    clauses.push({ pricePerNight: priceFilter });
  }

  if (clauses.length > 0) {
    filter.$and = clauses;
  }

  const total = await ResortModel.countDocuments(filter);
  const resorts = await ResortModel.find(filter)
    .sort({ name: 1 })
    .skip((page - 1) * limit)
    .limit(limit);

  sendResponse(res, 200, 'Resorts retrieved successfully', {
    resorts,
    pagination: {
      page,
      limit,
      total,
      totalPages: total > 0 ? Math.ceil(total / limit) : 0,
    },
  });
});

/**
 * GET /api/resorts/:id
 * Fetch a single resort by its MongoDB ID.
 */
export const getResortById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const resort = await ResortModel.findById(id);
  if (!resort) {
    throw new AppError('Resort not found', 404);
  }

  sendResponse(res, 200, 'Resort retrieved successfully', resort);
});

/**
 * POST /api/resorts
 * Add a new resort.
 */
export const createResort = catchAsync(async (req: Request, res: Response) => {
  const resortData = req.body;

  if (!resortData || Object.keys(resortData).length === 0) {
    throw new AppError('Resort data cannot be empty', 400);
  }

  // The schema's required field is `name`, but the admin panel's resort
  // form (and the wider frontend, which reads getResortName() falling
  // back through resortName/place_name) sends `resortName` instead.
  // Fill `name` in from it here so a resort created via the admin form
  // still passes schema validation without the client needing to send
  // a field the rest of the app doesn't otherwise use.
  if (!resortData.name && resortData.resortName) {
    resortData.name = resortData.resortName;
  }

  const newResort = await ResortModel.create(resortData);
  sendResponse(res, 201, 'Resort created successfully', newResort);
});

/**
 * PATCH /api/resorts/:id
 * Update an existing resort's details.
 */
export const updateResort = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const updatedResort = await ResortModel.findByIdAndUpdate(
    id,
    { $set: req.body },
    { new: true, runValidators: true }
  );

  if (!updatedResort) {
    throw new AppError('Resort not found', 404);
  }

  sendResponse(res, 200, 'Resort updated successfully', updatedResort);
});

/**
 * DELETE /api/resorts/:id
 * Remove a resort.
 */
export const deleteResort = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const deletedResort = await ResortModel.findByIdAndDelete(id);
  if (!deletedResort) {
    throw new AppError('Resort not found', 404);
  }

  sendResponse(res, 200, 'Resort deleted successfully', deletedResort);
});
