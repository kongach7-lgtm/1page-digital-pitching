import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    isSet: Boolean(process.env.ADMIN_PASSCODE),
  });
}
