#include <iostream>
#include <string>
#include <cstdlib>
using namespace std;

int main()
{
    system("chcp 65001");
    system("cls");

    cout << "============================\n";
    cout << "   YouTube Downloader\n";
    cout << "============================\n\n";

    string url;
    cout << "Enter video or playlist URL: ";
    getline(cin, url);

    cout << "\nChoose type:\n";
    cout << "1 - Video\n";
    cout << "2 - Audio (MP3)\n";

    int type;
    cin >> type;

    cin.ignore();

    string command;
    //mp4
    if (type == 1)
    {
        cout << "\nChoose quality:\n";
        cout << "1 - 144p\n2 - 360p\n3 - 720p\n4 - 1080p\n";

        int choice;
        cin >> choice;

        string quality;

        switch (choice)
        {
        case 1:
            quality = "bestvideo[height<=144]+bestaudio/bestvideo[height>=144]+bestaudio/best";
            break;
        case 2:
            quality = "bestvideo[height<=360]+bestaudio/bestvideo[height>=360]+bestaudio/best";
            break;
        case 3:
            quality = "bestvideo[height<=720]+bestaudio/bestvideo[height>=720]+bestaudio/best";
            break;
        case 4:
            quality = "bestvideo[height<=1080]+bestaudio/bestvideo[height>=1080]+bestaudio/best";
            break;
        default:
            cout << "Invalid choice! Using best quality.\n";
            quality = "best";
        }

        command =
            ".\\yt-dlp.exe "
            "--ffmpeg-location .\\ "
            "--newline "
            "-f \"" + quality + "\" "
            "-o \"%(title)s.%(ext)s\" "
            "\"" + url + "\"";
    }
    //mp3
    else if (type == 2)
    {
        command =
            ".\\yt-dlp.exe "
            "--ffmpeg-location .\\ "
            "--newline "
            "-x --audio-format mp3 "
            "-o \"%(title)s.%(ext)s\" "
            "\"" + url + "\"";
    }
    else
    {
        cout << "Invalid choice!\n";
        system("pause");
        return 0;
    }

    cout << "\nProcessing...\n\n";

    system(command.c_str());

    cout << "\nDownload completed successfully!\n";
    system("pause");

    return 0;
}