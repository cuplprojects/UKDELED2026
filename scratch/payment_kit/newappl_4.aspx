<%@ Page Language="C#" Title="Payment-New Application" AutoEventWireup="true" MasterPageFile="~/ApplMngt/ApplMngr.master" CodeFile="newappl_4.aspx.cs" Inherits="test" %>
<asp:Content ID="Content1" ContentPlaceHolderID="ContentPlaceHolder1" Runat="Server">
<!--<script src="https://pgtest.atomtech.in/staticdata/ots/js/atomcheckout.js" type="text/javascript"></script>-->
<script src="https://psa.atomtech.in/staticdata/ots/js/atomcheckout.js" type="text/javascript"></script>
<script type="text/javascript"> 
    openPay = () => {
        const tokenId = document.getElementById("<%=HfTokenID.ClientID %>").innerHTML // token id which is generated
        if (tokenId) {
            const options = {
                "atomTokenId": document.getElementById("<%=HfTokenID.ClientID %>").innerHTML, // token id which is generated
                "merchId": document.getElementById("<%=HfmID.ClientID%>").innerHTML, // merchant id same as available in json data
                "custEmail": document.getElementById("<%=HfEmail.ClientID%>").innerHTML, // valid email id (Avoid test word in value )
                "custMobile": document.getElementById("<%=HfMobile.ClientID%>").innerHTML, // valid 10 digit mobile number
                "returnUrl": "https://ukdeled.com//t26est/ApplMngt/pmtProcess.aspx" // Return URL
            }
                let atom = new AtomPaynetz(options, 'uat');
            }
        };
</script>
<div class="pgtitle"><i class="fa fa-file"></i>New Application</div>

<!--wizard--><ul id="wizardStatus">
  <li class="completed">1. Application Form</li>
  <li class="completed">2. Upload Photo</li>
  <li class="completed">3. Preview</li>
  <li class="current">4. Payment</li>
</ul><!--wizard-->

<asp:Label ID="lberror" CssClass="lberror" runat="server" Text=""></asp:Label>
<asp:Label ID="lbsucc" CssClass="lbsucc" runat="server" Text=""></asp:Label>

<asp:Label ID="lb_appl_id" CssClass="lbsucc" runat="server" Text="" Visible="false"></asp:Label>
<asp:Label ID="Tok_id" CssClass="lbsucc" runat="server" Text="" Visible="true"></asp:Label>
<asp:Label ID="lbldata" CssClass="lbsucc" runat="server" Text="" Visible="true"></asp:Label>

<div style="display:none;">
<asp:Label ID="HfmID" runat="server"></asp:Label>
<asp:Label ID="HfOrderID" runat="server"></asp:Label>
<asp:Label ID="HfTokenID" runat="server"></asp:Label>
<asp:Label ID="HfAmount" runat="server" ></asp:Label>
<asp:Label ID="HfEmail" runat="server"></asp:Label>
<asp:Label ID="HfMobile" runat="server"></asp:Label>
<asp:Label ID="HfName" runat="server"></asp:Label>
<asp:Label ID="HfCourse" runat="server"></asp:Label>
</div>
<!-- payment page --><div id="panel_payment" runat="server" visible="false" class="new_appl" style="width:650px; margin-top:5%;">
<table class="frmtable" border="1" style="line-height:50px;">
<tr><td colspan="2" style="background:#ccc; font-weight:bold; text-align:center; line-height:40px;"> Payment Details (भुगतान का विवरण)</td></tr>
<tr>
<td style="width:200px; font-size:20px; text-align:center;">आवेदन शुल्क</td>
<td style="font-size:25px; color:green; padding-left:50px; font-weight:bold;"><asp:Label ID="lbamount" runat="server" Text="0.00"></asp:Label></td>
</tr>
<tr><td colspan="2" style="line-height:25px; padding-left:3pt;"><a href="../terms.pdf" target="_blank">CLICK HERE</a> to download the Terms & Conditions and Policy Document for Online Payments.</td></tr>
<tr><td colspan="2" style="line-height:35px; padding-left:3pt; color:red; font-weight:bold;"><center>I hereby confirm that I have read this document and agree to the conditions listed thereof.</center></td></tr>
<tr>
<td style=" padding-left:3pt;"><asp:HyperLink ID="hplback" CssClass="button2" runat="server">Back to Preview</asp:HyperLink></td>
<td style="text-align:center; vertical-align:middle;">
<asp:Button ID="btnpay" Text="Click here for Payment" CssClass="button" runat="server" OnClientClick="openPay(); return false"  />
</td>
</tr>
<tr><td colspan="2" style="line-height:35px; padding-left:3pt; color:red; font-weight:bold;">यदि आपके अकाउंट से भुगतान कट गया है, परन्तु ऑनलाइन आवेदन में अपडेट नही हुवा है तो कृपया 24 घन्टे में स्वतः अपडेट हो जायेगा  | दोबारा भुगतान करने से बचें |</td></tr>
</table>
</div><!-- payment page -->

<!--panel_end--><asp:Panel ID="panel_end" runat="server" Visible="false">
<div style="text-align:center; color:red; font-size:25px; line-height:40px; padding-top:50px;">शुल्क भुगतान की तिथि समाप्त हो चुकी है</div>
</asp:Panel><!--panel_end-->

<asp:Label ID="lbjason" CssClass="lbsucc" runat="server" Text="" Visible="true"></asp:Label>
</asp:Content>
