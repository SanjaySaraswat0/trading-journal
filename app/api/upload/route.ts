import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/options';
import { createServiceClient } from '@/lib/supabase/service';

export async function POST(request: NextRequest) {
  console.log('=== POST /api/upload START ===');
  
  try {
    // Get session
    const session = await getServerSession(authOptions);
    console.log('1. Session check:', session?.user?.id ? 'Found' : 'Not found');
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get file from form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log('2. File received:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Validate file
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only images allowed' }, { status: 400 });
    }

    // Create unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${session.user.id}/${fileName}`;

    console.log('3. File path:', filePath);

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    console.log('4. Creating Supabase client...');
    const supabase = createServiceClient();

    // Check if bucket exists
    console.log('5. Checking if bucket exists...');
    const { data: buckets, error: bucketError } = await supabase
      .storage
      .listBuckets();

    if (bucketError) {
      console.error('Bucket list error:', bucketError);
      return NextResponse.json({ 
        error: 'Storage error: ' + bucketError.message 
      }, { status: 500 });
    }

    console.log('Available buckets:', buckets?.map(b => b.name));

    const bucketExists = buckets?.some(b => b.name === 'trade-screenshots');
    
    if (!bucketExists) {
      console.error('❌ Bucket "trade-screenshots" not found!');
      return NextResponse.json({ 
        error: 'Storage bucket not found. Please create "trade-screenshots" bucket in Supabase Storage.',
        availableBuckets: buckets?.map(b => b.name)
      }, { status: 500 });
    }

    console.log('6. Uploading to Supabase Storage...');

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('trade-screenshots')
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      return NextResponse.json({ 
        error: 'Upload failed: ' + error.message,
        details: error
      }, { status: 500 });
    }

    console.log('7. Upload successful:', data);

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('trade-screenshots')
      .getPublicUrl(filePath);

    console.log('8. Public URL:', publicUrl);

    return NextResponse.json({ 
      url: publicUrl,
      path: filePath,
      success: true 
    });

  } catch (error: any) {
    console.error('=== UPLOAD ERROR ===');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    
    return NextResponse.json({ 
      error: error.message || 'Upload failed',
      type: error.constructor.name
    }, { status: 500 });
  }
}