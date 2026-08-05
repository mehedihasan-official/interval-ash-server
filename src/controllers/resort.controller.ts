import { Request, Response } from 'express';
import { ResortModel } from '../models/resort.model';
import { catchAsync } from '../utils/catch-async';
import { sendResponse } from '../utils/send-response';
import { AppError } from '../utils/app-error';

/**
 * GET /api/resorts
 * Fetch every resort in the database.
 */
export const getAllResorts = catchAsync(async (_req: Request, res: Response) => {
  const resorts = await ResortModel.find();
  sendResponse(res, 200, 'Resorts retrieved successfully', resorts);
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
