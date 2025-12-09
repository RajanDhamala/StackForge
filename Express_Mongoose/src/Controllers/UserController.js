import asyncHandler from "../Utils/AsyncHandler.js"
import ApiError from "../Utils/ApiError.js"
import ApiResponse from "../Utils/ApiResponse.js"
import User from "../Schemas/UserSchema.js"
import Joi from "joi"
import { hashPassword,verifyPassword,CreateAccessToken,CreateRefreshToken } from "../Utils/Authutils.js"

const registerScheama = Joi.object({
  email: Joi.string().email().required(),
  fullname: Joi.string().min(3).max(30).trim().required(),
  password: Joi.string().min(6).required()
});

const loginSchema=Joi.object({
    email:Joi.string().email().required(),
    password:Joi.string().min(6).required()
})

const RegisterUser = asyncHandler(async (req, res) => {
  const { error, value } = registerScheama.validate(req.body);

  if (error) {
    throw new ApiError(400, "Invalid input", error.details.map(d => d.message));
  }

  const normalizedEmail = value.email.toLowerCase();

  const userExists = await User.findOne({ email: normalizedEmail }).lean();
  if (userExists) {
    throw new ApiError(400, "User with this email already exists");
  }

  const pwd = await hashPassword(value.password);

  const newUser = new User({
    email: normalizedEmail,
    fullname: value.fullname,
    password: pwd,
  });

  await newUser.save();

  return res.send(
    new ApiResponse(200, "User registered successfully", {
      id: newUser._id,
      email: newUser.email,
      fullname: newUser.fullname,
    })
  );
});


const LoginUser = asyncHandler(async (req, res) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    throw new ApiError(400, "Invalid credentials", error.details.map(d => d.message));
  }
  const email = value.email.toLowerCase();

  const existingUser = await User.findOne({ email }).select("fullname _id email password");
  if (!existingUser) {
    throw new ApiError(400, "Invalid credentials");
  }
  const isValid = await verifyPassword(value.password, existingUser.password);
  if (!isValid) {
    throw new ApiError(400, "Invalid credentials");
  }

  const newAccessToken = CreateAccessToken(existingUser._id, existingUser.email, existingUser.fullname);
  const newRefreshToken = CreateRefreshToken(existingUser._id, existingUser.email, existingUser.fullname);

  res.cookie("accessToken", newAccessToken, {
    httpOnly: true,
    secure: false, 
    maxAge: 10 * 60 * 1000,
    path: "/",
  });

  res.cookie("refreshToken", newRefreshToken, {
    httpOnly: true,
    secure: false, 
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });

  res.send(
    new ApiResponse(200, "User logged in successfully", {
      id: existingUser._id,
      fullname: existingUser.fullname,
      email: existingUser.email
    })
  );
});


const LogoutUser=asyncHandler(async(req,res)=>{
    res.clearCookie("accessToken",{
    httpOnly: true,
    secure: false,
    path: "/",
    })
    res.clearCookie("refreshToken",{
    httpOnly: true,
    secure: false,
    path: "/",
    })
    res.send(new ApiResponse(200,'User logged out succesfully'))
})

export {
    RegisterUser,LoginUser,LogoutUser
}