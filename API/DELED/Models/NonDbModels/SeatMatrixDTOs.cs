using System;
using System.Collections.Generic;

namespace DELED.Models.NonDbModels
{
    public class SeatMatrixFilterResponse
    {
        public List<SeatCityDto> Cities { get; set; } = new();
        public List<SeatCentreDto> Centres { get; set; } = new();
        public List<SeatRoomDto> Rooms { get; set; } = new();
        public int TotalAllottedCandidates { get; set; }
    }

    public class SeatCityDto
    {
        public string CityCode { get; set; } = string.Empty;
        public string CityName { get; set; } = string.Empty;
        public int CentreCount { get; set; }
        public int CandidateCount { get; set; }
    }

    public class SeatCentreDto
    {
        public string CityCode { get; set; } = string.Empty;
        public string CityName { get; set; } = string.Empty;
        public string CentreCode { get; set; } = string.Empty;
        public string CentreName { get; set; } = string.Empty;
        public string? CentreNameHindi { get; set; }
        public int? Capacity { get; set; }
        public int CandidateCount { get; set; }
        public int RoomCount { get; set; }
    }

    public class SeatRoomDto
    {
        public string CityCode { get; set; } = string.Empty;
        public string CentreCode { get; set; } = string.Empty;
        public int RoomNumber { get; set; }
        public int CandidateCount { get; set; }
        public int? MinRollNumber { get; set; }
        public int? MaxRollNumber { get; set; }
    }

    public class SeatCandidateDto
    {
        public int AllotmentId { get; set; }
        public int UserId { get; set; }
        public int RollNumber { get; set; }
        public string RegistrationNo { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string FatherName { get; set; } = string.Empty;
        public string? Gender { get; set; }
        public string? Category { get; set; }
        public string? SubCategory { get; set; }
        public string? AppliedCategory { get; set; }
        public bool IsPhysicallyHandicapped { get; set; }
        public string? DisabilityType { get; set; }
        public string? MultiDisabilityType { get; set; }
        public bool ScribeRequired { get; set; }
        public string CityCode { get; set; } = string.Empty;
        public string CityName { get; set; } = string.Empty;
        public string CentreCode { get; set; } = string.Empty;
        public string CentreName { get; set; } = string.Empty;
        public int? RoomNumber { get; set; }
        public int? SeatRow { get; set; }
        public int? SeatNumber { get; set; }
        public DateTime? AllotmentDate { get; set; }
    }

    public class SeatCellDto
    {
        public int SeatIndex { get; set; }
        public int SeatRow { get; set; }
        public int SeatNumber { get; set; }
        public bool IsOccupied { get; set; }
        public SeatCandidateDto? Candidate { get; set; }
    }

    public class SeatMatrixRowDto
    {
        public int RowNumber { get; set; }
        public List<SeatCellDto> Seats { get; set; } = new();
    }

    public class SeatMatrixRoomSummaryDto
    {
        public int RoomNumber { get; set; }
        public string CityCode { get; set; } = string.Empty;
        public string CityName { get; set; } = string.Empty;
        public string CentreCode { get; set; } = string.Empty;
        public string CentreName { get; set; } = string.Empty;
        public int TotalCandidates { get; set; }
        public int? MinRollNumber { get; set; }
        public int? MaxRollNumber { get; set; }
        public int? Capacity { get; set; }
    }

    public class SeatMatrixResponse
    {
        public bool Success { get; set; } = true;
        public string Message { get; set; } = string.Empty;
        public SeatMatrixSummaryDto Summary { get; set; } = new();
        public List<SeatMatrixRoomSummaryDto> RoomSummaries { get; set; } = new();
        public List<SeatCandidateDto> Candidates { get; set; } = new();
        public List<SeatMatrixRowDto>? Grid { get; set; }
        public SeatPaginationDto Pagination { get; set; } = new();
    }

    public class SeatMatrixSummaryDto
    {
        public int TotalCandidates { get; set; }
        public int TotalRooms { get; set; }
        public int? MinRollNumber { get; set; }
        public int? MaxRollNumber { get; set; }
        public string? SelectedCityCode { get; set; }
        public string? SelectedCityName { get; set; }
        public string? SelectedCentreCode { get; set; }
        public string? SelectedCentreName { get; set; }
        public int? SelectedRoomNumber { get; set; }
    }

    public class SeatPaginationDto
    {
        public int TotalCount { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 50;
        public int TotalPages { get; set; } = 1;
    }
}
