using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using MimeKit;
using HotelERP.BE.Application.Interfaces;

namespace HotelERP.BE.Application.Services;

public class EmailService : IEmailService
{
    private readonly IConfiguration _config;

    public EmailService(IConfiguration config)
    {
        _config = config;
    }

    public async Task SendEmailAsync(string toEmail, string subject, string htmlMessage)
    {
        var email = new MimeMessage();
        email.From.Add(new MailboxAddress(_config["SmtpSettings:SenderName"], _config["SmtpSettings:SenderEmail"] ?? "no-reply@hotelerp.com"));
        email.To.Add(MailboxAddress.Parse(toEmail));
        email.Subject = subject;

        var builder = new BodyBuilder { HtmlBody = htmlMessage };
        email.Body = builder.ToMessageBody();

        using var smtp = new SmtpClient();
        await smtp.ConnectAsync(_config["SmtpSettings:Server"]!, int.Parse(_config["SmtpSettings:Port"]!), SecureSocketOptions.StartTls);
        await smtp.AuthenticateAsync(_config["SmtpSettings:SenderEmail"]!, _config["SmtpSettings:Password"]!);
        await smtp.SendAsync(email);
        await smtp.DisconnectAsync(true);
    }
}