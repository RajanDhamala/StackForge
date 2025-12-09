import asyncHandler from "../Utils/AsyncHandler.js"
import ApiError from "../Utils/ApiError.js"
import ApiResponse from "../Utils/ApiResponse.js"
import prisma from "../Utils/PrismaProvider.js"
import Joi from "joi"
import { hashPassword,verifyPassword,CreateAccessToken,CreateRefreshToken } from "../Utils/Authutils.js"


const registerScheama = Joi.object({
  email: Joi.string().email().required(),
  fullname: Joi.string().min(5).max(20).required(),
  password: Joi.string().min(6).trim().required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).trim().required()
});

const RegisterUser = asyncHandler(async (req, res) => {
  const { error, value } = registerScheama.validate(req.body);

  if (error) {
    throw new ApiError(400, "Invalid input", error.details.map(d => d.message));
  }

  const email = value.email.toLowerCase(); 

  const userExists = await prisma.user.findFirst({
    where: { email }
  });

  if (userExists) {
    throw new ApiError(400, "User with this email already exists");
  }

  const hashedPwd = await hashPassword(value.password.trim());
  const newUser = await prisma.user.create({
    data: {
      email,
      fullname: value.fullname,
      password: hashedPwd
    },
    select: {
      id: true,
      email: true,
      fullname: true,
      createdAt: true
    }
  });

  return res.send(
    new ApiResponse(200, "User registered successfully", newUser)
  );
});

const LoginUser = asyncHandler(async (req, res) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    throw new ApiError(400, "Invalid credentials", error.details.map(d => d.message));
  }
  const email = value.email.toLowerCase();

  const existingUser = await prisma.user.findFirst({
    where: { email },
    select: {
      id: true,
      email: true,
      fullname: true,
      password: true
    }
  });

  if (!existingUser) {
    throw new ApiError(400, "Invalid credentials");
  }
  const isPasswordValid = await verifyPassword(value.password.trim(), existingUser.password);
  if (!isPasswordValid) {
    throw new ApiError(400, "Invalid credentials");
  }

  const accessToken = CreateAccessToken(
    existingUser.id,
    existingUser.email,
    existingUser.fullname
  );

  const refreshToken = CreateRefreshToken(
    existingUser.id,
    existingUser.email,
    existingUser.fullname
  );

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: false,
    maxAge: 10 * 60 * 1000,
    path: "/"
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: false,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/"
  });

  res.send(
    new ApiResponse(200, "User logged in successfully", {
      id: existingUser.id,
      fullname: existingUser.fullname,
      email: existingUser.email
    })
  );
});

const LogoutUser = asyncHandler(async (req, res) => {
  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: false,
    path: "/"
  });

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: false,
    path: "/"
  });

  res.send(new ApiResponse(200, "User logged out successfully"));
});




export {
    RegisterUser,LoginUser,LogoutUser
}