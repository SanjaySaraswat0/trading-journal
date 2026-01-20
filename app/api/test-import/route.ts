import { NextResponse } from 'next/server';

export async function GET() {
  console.log('✅ TEST GET working');
  return NextResponse.json({ status: 'GET works' });
}

export async function POST() {
  console.log('✅ TEST POST working');
  return NextResponse.json({ status: 'POST works' });
}