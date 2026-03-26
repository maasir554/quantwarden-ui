// app/api/auth/signup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { email, password, orgName, domains } = await req.json();

    // 1. validation
    if (!email || !password || !orgName || !domains) {
      return NextResponse.json(
        { success: false, message: "All fields are required" },
        { status: 400 }
      );
    }

    // 2. check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "User already exists" },
        { status: 400 }
      );
    }

    // 3. hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. create organization
    const org = await prisma.organization.create({
      data: {
        name: orgName,
        domains, // must be array
      },
    });

    // 5. create admin user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: "admin",
        orgId: org.id,
      },
    });

    // 6. set session cookie
    const response = NextResponse.json({ success: true });

    response.cookies.set("session", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;

  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}