import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function POST(request: Request) {
    try {
        const { name, email, password } = await request.json();

        // Validation
        if (!name || !email || !password) {
            return NextResponse.json(
                { error: 'Name, email, and password are required' },
                { status: 400 }
            );
        }

        if (password.length < 8) {
            return NextResponse.json(
                { error: 'Password must be at least 8 characters' },
                { status: 400 }
            );
        }

        // Use Supabase Auth to create user
        const supabase = createServiceClient();

        const { data, error } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                name,
            },
        });

        if (error) {
            console.error('Signup error:', error);

            // Handle specific error cases
            if (error.message.includes('already registered') || error.message.includes('already been registered')) {
                return NextResponse.json(
                    { error: 'Email already registered' },
                    { status: 409 }
                );
            }

            return NextResponse.json(
                { error: error.message || 'Failed to create account' },
                { status: 500 }
            );
        }

        return NextResponse.json(
            {
                message: 'Account created successfully',
                user: {
                    id: data.user?.id,
                    name,
                    email
                }
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('Signup error:', error);
        return NextResponse.json(
            { error: 'An error occurred during signup' },
            { status: 500 }
        );
    }
}
